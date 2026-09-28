clc;
clear;
close all;

fprintf('====================================================\n');
fprintf('        MODULE 4 - MOBILE NET V2 DR GRADING\n');
fprintf('                 GPU TRAINING\n');
fprintf('====================================================\n\n');

%% ============================================================
% 1. PROJECT PATHS
% ============================================================

projectFolder = ...
    "C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB";

preparedFile = fullfile( ...
    projectFolder, ...
    "results", ...
    "APTOS_Grading", ...
    "APTOS_Grading_Prepared.csv");

imageFolder = fullfile( ...
    projectFolder, ...
    "results", ...
    "APTOS_Enhanced", ...
    "images");

outputFolder = fullfile( ...
    projectFolder, ...
    "results", ...
    "APTOS_Grading");

if ~isfolder(outputFolder)
    mkdir(outputFolder);
end

%% ============================================================
% 2. LOAD PREPARED DATA
% ============================================================

if ~isfile(preparedFile)
    error("Prepared grading file not found:\n%s", preparedFile);
end

T = readtable(preparedFile);

fprintf("Total prepared records: %d\n", height(T));

%% ============================================================
% 3. SPLIT DATA
% ============================================================

trainRows = string(T.split) == "TRAIN";
valRows   = string(T.split) == "VALIDATION";
testRows  = string(T.split) == "TEST";

trainTable = T(trainRows,:);
valTable   = T(valRows,:);
testTable  = T(testRows,:);

fprintf("Training images   : %d\n", height(trainTable));
fprintf("Validation images : %d\n", height(valTable));
fprintf("Test images       : %d\n", height(testTable));

%% ============================================================
% 4. CREATE IMAGE PATHS
% ============================================================

trainFiles = fullfile( ...
    imageFolder, ...
    string(trainTable.enhancedImage));

valFiles = fullfile( ...
    imageFolder, ...
    string(valTable.enhancedImage));

testFiles = fullfile( ...
    imageFolder, ...
    string(testTable.enhancedImage));

%% ============================================================
% 5. VERIFY FILES
% ============================================================

fprintf('\nChecking image files...\n');

trainExists = isfile(trainFiles);
valExists   = isfile(valFiles);
testExists  = isfile(testFiles);

fprintf("Missing training images   : %d\n", sum(~trainExists));
fprintf("Missing validation images : %d\n", sum(~valExists));
fprintf("Missing test images       : %d\n", sum(~testExists));

if any(~trainExists) || any(~valExists) || any(~testExists)
    error("Required enhanced image files are missing.");
end

%% ============================================================
% 6. LABELS
% ============================================================

classNames = categorical( ...
    {'Grade0','Grade1','Grade2','Grade3','Grade4'});

trainLabels = categorical( ...
    trainTable.diagnosis, ...
    0:4, ...
    {'Grade0','Grade1','Grade2','Grade3','Grade4'});

valLabels = categorical( ...
    valTable.diagnosis, ...
    0:4, ...
    {'Grade0','Grade1','Grade2','Grade3','Grade4'});

testLabels = categorical( ...
    testTable.diagnosis, ...
    0:4, ...
    {'Grade0','Grade1','Grade2','Grade3','Grade4'});

%% ============================================================
% 7. CLASS DISTRIBUTION
% ============================================================

fprintf('\nTRAINING CLASS DISTRIBUTION\n');
fprintf('---------------------------\n');

classCounts = zeros(5,1);

for k = 1:5

    classCounts(k) = ...
        sum(trainLabels == classNames(k));

    fprintf('%s : %d images\n', ...
        string(classNames(k)), ...
        classCounts(k));

end

%% ============================================================
% 8. IMAGE DATASTORES
% ============================================================

trainDS = imageDatastore( ...
    trainFiles, ...
    'Labels', trainLabels);

valDS = imageDatastore( ...
    valFiles, ...
    'Labels', valLabels);

testDS = imageDatastore( ...
    testFiles, ...
    'Labels', testLabels);

%% ============================================================
% 9. LOAD MOBILENETV2
% ============================================================

fprintf('\nLoading pretrained MobileNetV2...\n');

net = mobilenetv2;

inputSize = net.Layers(1).InputSize;

fprintf("CNN input size: %d x %d x %d\n", ...
    inputSize(1), ...
    inputSize(2), ...
    inputSize(3));

%% ============================================================
% 10. DATA AUGMENTATION
% ============================================================
%
% Mild augmentation suitable for retinal photographs.
% We avoid strong transformations that could distort lesion
% appearance.
% ============================================================

imageAugmenter = imageDataAugmenter( ...
    'RandRotation',[-8 8], ...
    'RandXTranslation',[-8 8], ...
    'RandYTranslation',[-8 8], ...
    'RandXScale',[0.95 1.05], ...
    'RandYScale',[0.95 1.05]);

augTrainDS = augmentedImageDatastore( ...
    inputSize(1:2), ...
    trainDS, ...
    'DataAugmentation',imageAugmenter, ...
    'ColorPreprocessing','gray2rgb');

augValDS = augmentedImageDatastore( ...
    inputSize(1:2), ...
    valDS, ...
    'ColorPreprocessing','gray2rgb');

augTestDS = augmentedImageDatastore( ...
    inputSize(1:2), ...
    testDS, ...
    'ColorPreprocessing','gray2rgb');

%% ============================================================
% 11. MODIFY MOBILENETV2
% ============================================================

lgraph = layerGraph(net);

% Exact layers confirmed from your MATLAB R2026a:
% Logits
% Logits_softmax
% ClassificationLayer_Logits

newFC = fullyConnectedLayer( ...
    5, ...
    'Name','DR_Logits', ...
    'WeightLearnRateFactor',10, ...
    'BiasLearnRateFactor',10);

newClassification = classificationLayer( ...
    'Name','DR_Classification');

lgraph = replaceLayer( ...
    lgraph, ...
    'Logits', ...
    newFC);

lgraph = replaceLayer( ...
    lgraph, ...
    'ClassificationLayer_Logits', ...
    newClassification);

%% ============================================================
% 12. FREEZE EARLY NETWORK
% ============================================================
%
% Train the classification head first.
% This greatly reduces the number of trainable parameters and
% reduces GPU memory usage.
% ============================================================

layers = lgraph.Layers;
connections = lgraph.Connections;

for i = 1:numel(layers)

    if isprop(layers(i),'WeightLearnRateFactor')

        layers(i).WeightLearnRateFactor = 0;
        layers(i).BiasLearnRateFactor = 0;

    end

end

% Unfreeze final classification layer

for i = 1:numel(layers)

    if strcmp(layers(i).Name,'DR_Logits')

        layers(i).WeightLearnRateFactor = 10;
        layers(i).BiasLearnRateFactor = 10;

    end

end

% Rebuild graph

lgraph = layerGraph();

for i = 1:numel(layers)

    lgraph = addLayers( ...
        lgraph, ...
        layers(i));

end

for i = 1:size(connections,1)

    lgraph = connectLayers( ...
        lgraph, ...
        connections.Source{i}, ...
        connections.Destination{i});

end

%% ============================================================
% 13. TRAINING OPTIONS
% ============================================================

miniBatchSize = 16;

validationFrequency = ...
    max(1, floor(height(trainTable)/miniBatchSize));

options = trainingOptions( ...
    'adam', ...
    'ExecutionEnvironment','gpu', ...
    'MiniBatchSize',miniBatchSize, ...
    'MaxEpochs',8, ...
    'InitialLearnRate',1e-4, ...
    'Shuffle','every-epoch', ...
    'ValidationData',augValDS, ...
    'ValidationFrequency',validationFrequency, ...
    'ValidationPatience',3, ...
    'Verbose',true, ...
    'Plots','training-progress', ...
    'VerboseFrequency',20);

%% ============================================================
% 14. GPU CHECK
% ============================================================

fprintf('\nChecking GPU...\n');

gpu = gpuDevice;

fprintf("GPU: %s\n", gpu.Name);

fprintf("Total GPU memory     : %.2f GB\n", ...
    gpu.TotalMemory/1e9);

fprintf("Available GPU memory : %.2f GB\n", ...
    gpu.AvailableMemory/1e9);

%% ============================================================
% 15. TRAIN
% ============================================================

fprintf('\n====================================================\n');
fprintf('             STARTING GPU TRAINING\n');
fprintf('====================================================\n');

tic;

trainedNet = trainNetwork( ...
    augTrainDS, ...
    lgraph, ...
    options);

trainingTime = toc;

fprintf('\nTraining completed.\n');
fprintf('Training time: %.2f minutes\n', ...
    trainingTime/60);

%% ============================================================
% 16. VALIDATION
% ============================================================

fprintf('\nRunning validation prediction...\n');

valPred = classify( ...
    trainedNet, ...
    augValDS, ...
    'ExecutionEnvironment','gpu');

valTrue = valDS.Labels;

valAccuracy = ...
    mean(valPred == valTrue);

fprintf('Validation accuracy: %.2f%%\n', ...
    valAccuracy*100);

%% ============================================================
% 17. TEST
% ============================================================

fprintf('\nRunning final test prediction...\n');

testPred = classify( ...
    trainedNet, ...
    augTestDS, ...
    'ExecutionEnvironment','gpu');

testTrue = testDS.Labels;

testAccuracy = ...
    mean(testPred == testTrue);

fprintf('Test accuracy: %.2f%%\n', ...
    testAccuracy*100);

%% ============================================================
% 18. CONFUSION MATRIX
% ============================================================

figure( ...
    'Name','MobileNetV2 - APTOS Confusion Matrix', ...
    'NumberTitle','off');

cm = confusionchart( ...
    testTrue, ...
    testPred);

cm.Title = ...
    'MobileNetV2 - APTOS Test Confusion Matrix';

cm.RowSummary = 'row-normalized';

cm.ColumnSummary = 'column-normalized';

%% ============================================================
% 19. PER-CLASS RECALL
% ============================================================

C = confusionmat( ...
    testTrue, ...
    testPred);

classRecall = zeros(5,1);

for k = 1:5

    denominator = sum(C(k,:));

    if denominator > 0
        classRecall(k) = C(k,k) / denominator;
    end

end

fprintf('\nPER-CLASS RECALL\n');
fprintf('----------------\n');

for k = 1:5

    fprintf('%s : %.2f%%\n', ...
        string(classNames(k)), ...
        classRecall(k)*100);

end

balancedAccuracy = ...
    mean(classRecall);

fprintf('\nBalanced accuracy: %.2f%%\n', ...
    balancedAccuracy*100);

%% ============================================================
% 20. SAVE MODEL
% ============================================================

modelFile = fullfile( ...
    outputFolder, ...
    'MobileNetV2_DR_Model.mat');

save( ...
    modelFile, ...
    'trainedNet', ...
    'inputSize', ...
    'valAccuracy', ...
    'testAccuracy', ...
    'balancedAccuracy', ...
    'classRecall', ...
    'trainingTime', ...
    'classNames');

fprintf('\nModel saved to:\n%s\n', ...
    modelFile);

%% ============================================================
% 21. FINAL SUMMARY
% ============================================================

fprintf('\n====================================================\n');
fprintf('             CNN TRAINING COMPLETE\n');
fprintf('====================================================\n');

fprintf('Training images     : %d\n', ...
    height(trainTable));

fprintf('Validation images   : %d\n', ...
    height(valTable));

fprintf('Test images         : %d\n', ...
    height(testTable));

fprintf('Validation accuracy : %.2f%%\n', ...
    valAccuracy*100);

fprintf('Test accuracy       : %.2f%%\n', ...
    testAccuracy*100);

fprintf('Balanced accuracy   : %.2f%%\n', ...
    balancedAccuracy*100);

fprintf('Training time       : %.2f minutes\n', ...
    trainingTime/60);

fprintf('Model:\n%s\n', ...
    modelFile);

fprintf('====================================================\n');