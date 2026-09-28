%% ============================================================
%  EYEQ FUNDUS IMAGE QUALITY CLASSIFIER
%  Good / Usable / Reject
%  GPU Training - MobileNetV2
% =============================================================
T = readtable(mappingFile, ...
    "VariableNamingRule","preserve");

fprintf("Total EyeQ images: %d\n",height(T));

fprintf("\nCSV columns:\n");
disp(T.Properties.VariableNames);
clear;
clc;
close all;

fprintf("\n============================================================\n");
fprintf("             EyeQ QUALITY CLASSIFIER\n");
fprintf("============================================================\n\n");

%% ------------------------------------------------------------
% PATHS
% ------------------------------------------------------------

projectRoot = ...
    "C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB";

mappingFile = fullfile( ...
    projectRoot, ...
    "results", ...
    "EyeQ", ...
    "EyeQ_Train_Mapping.csv");

modelDir = fullfile( ...
    projectRoot, ...
    "results", ...
    "EyeQ");

if ~exist(modelDir,"dir")
    mkdir(modelDir);
end

%% ------------------------------------------------------------
% LOAD MAPPING
% ------------------------------------------------------------

T = readtable(mappingFile);

fprintf("Total EyeQ images: %d\n",height(T));

%% ------------------------------------------------------------
% CONVERT QUALITY TO CATEGORICAL
% ------------------------------------------------------------

qualityLabels = strings(height(T),1);

qualityLabels(T.quality == 0) = "Good";
qualityLabels(T.quality == 1) = "Usable";
qualityLabels(T.quality == 2) = "Reject";

Y = categorical(qualityLabels, ...
    ["Good","Usable","Reject"]);

%% ------------------------------------------------------------
% TRAIN / VALIDATION SPLIT
% ------------------------------------------------------------

rng(42);

cv = cvpartition(Y,"HoldOut",0.20);

trainIdx = training(cv);
valIdx   = test(cv);

TTrain = T(trainIdx,:);
TVal   = T(valIdx,:);

YTrain = Y(trainIdx);
YVal   = Y(valIdx);

fprintf("\nTraining images   : %d\n",sum(trainIdx));
fprintf("Validation images : %d\n",sum(valIdx));

%% ------------------------------------------------------------
% DATASTORE
% ------------------------------------------------------------

imdsTrain = imageDatastore( ...
    TTrain.imagePath, ...
    "Labels",YTrain);

imdsVal = imageDatastore( ...
    TVal.imagePath, ...
    "Labels",YVal);

fprintf("\nTraining distribution:\n");
disp(countEachLabel(imdsTrain));

fprintf("Validation distribution:\n");
disp(countEachLabel(imdsVal));

%% ------------------------------------------------------------
% LOAD MOBILENETV2
% ------------------------------------------------------------

fprintf("\nLoading MobileNetV2...\n");

net = mobilenetv2;

inputSize = net.Layers(1).InputSize;

fprintf("Input size: %d x %d x %d\n", ...
    inputSize(1),inputSize(2),inputSize(3));

%% ------------------------------------------------------------
% REPLACE FINAL CLASSIFICATION LAYERS
% ------------------------------------------------------------

lgraph = layerGraph(net);

numClasses = 3;

newFC = fullyConnectedLayer( ...
    numClasses, ...
    "Name","EyeQ_Logits", ...
    "WeightLearnRateFactor",10, ...
    "BiasLearnRateFactor",10);

newClassLayer = classificationLayer( ...
    "Name","EyeQ_Classification");

lgraph = replaceLayer( ...
    lgraph, ...
    "Logits", ...
    newFC);

lgraph = replaceLayer( ...
    lgraph, ...
    "ClassificationLayer_Logits", ...
    newClassLayer);

%% ------------------------------------------------------------
% FREEZE BACKBONE
% ------------------------------------------------------------

layers = lgraph.Layers;

connections = lgraph.Connections;

for i = 1:numel(layers)

    if isprop(layers(i),"WeightLearnRateFactor")
        layers(i).WeightLearnRateFactor = 0;
    end

    if isprop(layers(i),"BiasLearnRateFactor")
        layers(i).BiasLearnRateFactor = 0;
    end

end

% Unfreeze final fully connected layer
idxFC = find(strcmp({layers.Name},"EyeQ_Logits"));

layers(idxFC).WeightLearnRateFactor = 10;
layers(idxFC).BiasLearnRateFactor   = 10;

lgraph = createLgraphUsingConnections(layers,connections);

%% ------------------------------------------------------------
% IMAGE AUGMENTATION
% ------------------------------------------------------------

imageAugmenter = imageDataAugmenter( ...
    "RandRotation",[-8 8], ...
    "RandXTranslation",[-8 8], ...
    "RandYTranslation",[-8 8], ...
    "RandXScale",[0.95 1.05], ...
    "RandYScale",[0.95 1.05]);

augimdsTrain = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsTrain, ...
    "DataAugmentation",imageAugmenter, ...
    "ColorPreprocessing","gray2rgb");

augimdsVal = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsVal, ...
    "ColorPreprocessing","gray2rgb");

%% ------------------------------------------------------------
% TRAINING OPTIONS
% ------------------------------------------------------------

miniBatchSize = 32;

options = trainingOptions("adam", ...
    "InitialLearnRate",1e-4, ...
    "MaxEpochs",8, ...
    "MiniBatchSize",miniBatchSize, ...
    "Shuffle","every-epoch", ...
    "ValidationData",augimdsVal, ...
    "ValidationFrequency", ...
        max(1,floor(sum(trainIdx)/miniBatchSize)), ...
    "Verbose",true, ...
    "Plots","training-progress", ...
    "ExecutionEnvironment","gpu", ...
    "L2Regularization",1e-4);

%% ------------------------------------------------------------
% GPU CHECK
% ------------------------------------------------------------

fprintf("\nChecking GPU...\n");

g = gpuDevice;

fprintf("GPU: %s\n",g.Name);
fprintf("Available memory: %.2f GB\n", ...
    g.AvailableMemory/1e9);

%% ------------------------------------------------------------
% TRAIN
% ------------------------------------------------------------

fprintf("\n============================================================\n");
fprintf("                  STARTING TRAINING\n");
fprintf("============================================================\n\n");

tic;

[trainedNet,info] = trainNetwork( ...
    augimdsTrain, ...
    lgraph, ...
    options);

trainingTime = toc;

fprintf("\nTraining time: %.2f minutes\n", ...
    trainingTime/60);

%% ------------------------------------------------------------
% VALIDATION PREDICTIONS
% ------------------------------------------------------------

fprintf("\nGenerating validation predictions...\n");

YPred = classify( ...
    trainedNet, ...
    augimdsVal, ...
    "ExecutionEnvironment","gpu");

YTrue = imdsVal.Labels;

%% ------------------------------------------------------------
% ACCURACY
% ------------------------------------------------------------

accuracy = mean(YPred == YTrue);

fprintf("\nValidation Accuracy: %.2f %%\n", ...
    accuracy*100);

%% ------------------------------------------------------------
% CONFUSION MATRIX
% ------------------------------------------------------------

figure;

confusionchart( ...
    YTrue, ...
    YPred);

title("EyeQ Quality Classifier - Validation");

saveas(gcf, ...
    fullfile(modelDir, ...
    "EyeQ_Quality_ConfusionMatrix.png"));

%% ------------------------------------------------------------
% PER-CLASS METRICS
% ------------------------------------------------------------

classes = categories(YTrue);

fprintf("\n============================================================\n");
fprintf("                 PER-CLASS RECALL\n");
fprintf("============================================================\n");

for i = 1:numel(classes)

    c = categorical(classes(i),classes);

    tp = sum((YTrue == c) & (YPred == c));

    actual = sum(YTrue == c);

    recall = tp / max(actual,1);

    fprintf("%-10s : %.2f %%\n", ...
        classes{i},recall*100);
end

%% ------------------------------------------------------------
% BALANCED ACCURACY
% ------------------------------------------------------------

recalls = zeros(numel(classes),1);

for i = 1:numel(classes)

    c = categorical(classes(i),classes);

    actual = sum(YTrue == c);

    tp = sum((YTrue == c) & (YPred == c));

    recalls(i) = tp / max(actual,1);

end

balancedAccuracy = mean(recalls);

fprintf("\nBalanced Accuracy: %.2f %%\n", ...
    balancedAccuracy*100);

%% ------------------------------------------------------------
% SAVE MODEL
% ------------------------------------------------------------

modelFile = fullfile( ...
    modelDir, ...
    "EyeQ_Quality_MobileNetV2.mat");

save(modelFile, ...
    "trainedNet", ...
    "info", ...
    "inputSize", ...
    "classes", ...
    "accuracy", ...
    "balancedAccuracy", ...
    "trainingTime", ...
    "-v7.3");

fprintf("\nModel saved:\n%s\n",modelFile);

%% ------------------------------------------------------------
% FINAL SUMMARY
% ------------------------------------------------------------

fprintf("\n============================================================\n");
fprintf("                  TRAINING COMPLETE\n");
fprintf("============================================================\n");

fprintf("Images             : %d\n",height(T));
fprintf("Training           : %d\n",sum(trainIdx));
fprintf("Validation         : %d\n",sum(valIdx));
fprintf("Validation Accuracy: %.2f %%\n",accuracy*100);
fprintf("Balanced Accuracy  : %.2f %%\n",balancedAccuracy*100);
fprintf("Training Time      : %.2f minutes\n",trainingTime/60);

fprintf("\nModel:\n%s\n",modelFile);

fprintf("\n============================================================\n");