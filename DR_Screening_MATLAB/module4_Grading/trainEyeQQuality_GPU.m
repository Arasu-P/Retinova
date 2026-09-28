%% EYEQ QUALITY CLASSIFIER - GPU
clear;
clc;
close all;

fprintf('\n========================================\n');
fprintf('EyeQ Quality Classifier - GPU\n');
fprintf('========================================\n');

%% PATHS
root = "C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB";

labelFile = fullfile(root, ...
    "data\EyeQ\data\Label_EyeQ_train.csv");

imageRoot = fullfile(root, ...
    "data\EyePACS\download\train\extracted");

resultDir = fullfile(root, ...
    "results\EyeQ");

if ~exist(resultDir,"dir")
    mkdir(resultDir);
end

modelFile = fullfile(resultDir, ...
    "EyeQ_Quality_MobileNetV2_GPU.mat");

%% GPU
fprintf('\nChecking GPU...\n');

g = gpuDevice;

fprintf("GPU: %s\n",g.Name);
fprintf("Memory: %.2f GB\n",g.TotalMemory/1e9);

%% READ EYEQ LABELS
fprintf('\nReading EyeQ labels...\n');

T = readtable(labelFile, ...
    "VariableNamingRule","preserve");

fprintf("EyeQ rows: %d\n",height(T));

eyeNames = string(T.image);
quality = double(T.quality);

eyeNames = strtrim(eyeNames);

%% QUALITY LABELS
labels = strings(height(T),1);

labels(quality == 0) = "Good";
labels(quality == 1) = "Usable";
labels(quality == 2) = "Reject";

Y = categorical(labels);

fprintf('\nQuality distribution:\n');
fprintf("Good   : %d\n",sum(quality == 0));
fprintf("Usable : %d\n",sum(quality == 1));
fprintf("Reject : %d\n",sum(quality == 2));

%% FIND EYEPACS IMAGES
fprintf('\nSearching EyePACS images...\n');

F = dir(fullfile(imageRoot,"**","*.jpeg"));

fprintf("EyePACS JPEG files: %d\n",numel(F));

%% IMAGE LOOKUP
names = strings(numel(F),1);
paths = strings(numel(F),1);

for i = 1:numel(F)
    names(i) = string(F(i).name);
    paths(i) = string(fullfile(F(i).folder,F(i).name));
end

%% MATCH
fprintf('\nMatching EyeQ images...\n');

[matched,idx] = ismember(eyeNames,names);

fprintf("Matched: %d / %d\n", ...
    sum(matched),numel(matched));

fprintf("Missing: %d\n", ...
    sum(~matched));

if any(~matched)
    fprintf('\nMissing image examples:\n');
    disp(eyeNames(~matched(1:min(sum(~matched),20))));
end

%% KEEP MATCHED DATA
imagePaths = paths(idx(matched));
Y = Y(matched);

fprintf("\nUsable images: %d\n",numel(imagePaths));

%% VERIFY FILES
valid = false(numel(imagePaths),1);

for i = 1:numel(imagePaths)
    valid(i) = isfile(imagePaths(i));
end

fprintf("Valid files: %d\n",sum(valid));

imagePaths = imagePaths(valid);
Y = Y(valid);

%% TRAIN / VALIDATION SPLIT
rng(42);

cv = cvpartition(Y,"HoldOut",0.20);

trainIdx = training(cv);
valIdx = test(cv);

trainPaths = imagePaths(trainIdx);
trainY = Y(trainIdx);

valPaths = imagePaths(valIdx);
valY = Y(valIdx);

fprintf("\nTraining images   : %d\n",numel(trainPaths));
fprintf("Validation images: %d\n",numel(valPaths));

%% DATASTORES
imdsTrain = imageDatastore( ...
    trainPaths, ...
    "Labels",trainY);

imdsVal = imageDatastore( ...
    valPaths, ...
    "Labels",valY);

%% MOBILENETV2
fprintf('\nLoading MobileNetV2...\n');

net = mobilenetv2;

inputSize = net.Layers(1).InputSize;

fprintf("Input size: %d x %d x %d\n", ...
    inputSize(1),inputSize(2),inputSize(3));

%% AUGMENTATION
augmenter = imageDataAugmenter( ...
    "RandRotation",[-8 8], ...
    "RandXTranslation",[-8 8], ...
    "RandYTranslation",[-8 8], ...
    "RandXScale",[0.95 1.05], ...
    "RandYScale",[0.95 1.05]);

augTrain = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsTrain, ...
    "DataAugmentation",augmenter, ...
    "ColorPreprocessing","gray2rgb");

augVal = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsVal, ...
    "ColorPreprocessing","gray2rgb");

%% LAYER GRAPH
fprintf('\nPreparing network...\n');

lgraph = layerGraph(net);

%% REPLACE FINAL FULLY CONNECTED LAYER
newFC = fullyConnectedLayer( ...
    3, ...
    "Name","EyeQ_Logits", ...
    "WeightLearnRateFactor",10, ...
    "BiasLearnRateFactor",10);

lgraph = replaceLayer( ...
    lgraph, ...
    "Logits", ...
    newFC);

%% REPLACE CLASSIFICATION LAYER
newClass = classificationLayer( ...
    "Name","EyeQ_Classification");

lgraph = replaceLayer( ...
    lgraph, ...
    "ClassificationLayer_Logits", ...
    newClass);

%% FREEZE BACKBONE
fprintf('Freezing MobileNetV2 backbone...\n');

L = lgraph.Layers;

for i = 1:numel(L)

    layer = L(i);
    changed = false;

    if isprop(layer,"WeightLearnRateFactor")
        layer.WeightLearnRateFactor = 0;
        changed = true;
    end

    if isprop(layer,"BiasLearnRateFactor")
        layer.BiasLearnRateFactor = 0;
        changed = true;
    end

    if changed
        lgraph = replaceLayer( ...
            lgraph, ...
            layer.Name, ...
            layer);
    end
end

%% UNFREEZE FINAL LAYER
finalLayer = lgraph.Layers( ...
    strcmp({lgraph.Layers.Name},"EyeQ_Logits"));

finalLayer.WeightLearnRateFactor = 10;
finalLayer.BiasLearnRateFactor = 10;

lgraph = replaceLayer( ...
    lgraph, ...
    "EyeQ_Logits", ...
    finalLayer);

fprintf('Backbone frozen.\n');
fprintf('EyeQ classifier trainable.\n');

%% TRAINING OPTIONS
miniBatch = 16;

valFrequency = max(1, ...
    floor(numel(trainPaths)/miniBatch));

options = trainingOptions("adam", ...
    "ExecutionEnvironment","gpu", ...
    "MiniBatchSize",miniBatch, ...
    "MaxEpochs",8, ...
    "InitialLearnRate",1e-4, ...
    "Shuffle","every-epoch", ...
    "ValidationData",augVal, ...
    "ValidationFrequency",valFrequency, ...
    "Verbose",true, ...
    "Plots","training-progress");

%% TRAIN
fprintf('\n========================================\n');
fprintf('STARTING GPU TRAINING\n');
fprintf('========================================\n');

tic;

trainedNet = trainNetwork( ...
    augTrain, ...
    lgraph, ...
    options);

trainTime = toc;

fprintf('\nTraining finished.\n');
fprintf("Training time: %.2f minutes\n",trainTime/60);

%% VALIDATION
fprintf('\nEvaluating validation set...\n');

YPred = classify( ...
    trainedNet, ...
    augVal, ...
    "ExecutionEnvironment","gpu");

accuracy = mean(YPred == valY);

fprintf('\n========================================\n');
fprintf('EYEQ QUALITY RESULTS\n');
fprintf('========================================\n');

fprintf("Validation Accuracy: %.2f%%\n", ...
    accuracy*100);

%% PER CLASS RECALL
classes = categories(valY);

for i = 1:numel(classes)

    c = categorical(classes(i),classes);

    actual = (valY == c);
    predicted = (YPred == c);

    TP = sum(actual & predicted);
    FN = sum(actual & ~predicted);

    if TP + FN > 0
        recall = TP/(TP+FN);
    else
        recall = 0;
    end

    fprintf("%s Recall: %.2f%%\n", ...
        classes{i},recall*100);
end

%% CONFUSION MATRIX
figure;

confusionchart(valY,YPred);

title("EyeQ Quality Classification");

%% SAVE MODEL
save(modelFile, ...
    "trainedNet", ...
    "inputSize", ...
    "classes", ...
    "accuracy", ...
    "trainTime", ...
    "-v7.3");

fprintf('\n========================================\n');
fprintf('MODEL SAVED SUCCESSFULLY\n');
fprintf('========================================\n');

fprintf("%s\n",modelFile);