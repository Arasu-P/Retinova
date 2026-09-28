clc;
clear;
close all;

fprintf('====================================================\n');
fprintf('        MODULE 4 - HYBRID FEATURE FUSION\n');
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

segFile = fullfile( ...
    projectFolder, ...
    "results", ...
    "APTOS_Segmentation", ...
    "APTOS_Segmentation_Features.csv");

modelFile = fullfile( ...
    projectFolder, ...
    "results", ...
    "APTOS_Grading", ...
    "MobileNetV2_DR_Model.mat");

imageFolder = fullfile( ...
    projectFolder, ...
    "results", ...
    "APTOS_Enhanced", ...
    "images");

outputFolder = fullfile( ...
    projectFolder, ...
    "results", ...
    "APTOS_Grading");

%% ============================================================
% 2. LOAD DATA
% ============================================================

T = readtable(preparedFile);
S = readtable(segFile);

fprintf('Prepared records     : %d\n',height(T));
fprintf('Segmentation records : %d\n',height(S));

%% ============================================================
% 3. LOAD TRAINED CNN
% ============================================================

fprintf('\nLoading trained MobileNetV2...\n');

M = load(modelFile);

trainedNet = M.trainedNet;

inputSize = M.inputSize;

fprintf('CNN input: %d x %d x %d\n', ...
    inputSize(1),inputSize(2),inputSize(3));

%% ============================================================
% 4. LOAD NORMALIZATION PARAMETERS
% ============================================================

normFile = fullfile( ...
    outputFolder, ...
    "grading_normalization.mat");

NORM = load(normFile);

featureMean = NORM.featureMean;
featureStd  = NORM.featureStd;

%% ============================================================
% 5. SPLIT DATA
% ============================================================

trainRows = string(T.split) == "TRAIN";
valRows   = string(T.split) == "VALIDATION";
testRows  = string(T.split) == "TEST";

trainTable = T(trainRows,:);
valTable   = T(valRows,:);
testTable  = T(testRows,:);

%% ============================================================
% 6. CREATE IMAGE DATASTORES
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

trainDS = imageDatastore( ...
    trainFiles, ...
    'Labels',trainLabels);

valDS = imageDatastore( ...
    valFiles, ...
    'Labels',valLabels);

testDS = imageDatastore( ...
    testFiles, ...
    'Labels',testLabels);

%% ============================================================
% 7. CREATE RESIZED DATASTORES
% ============================================================

augTrainDS = augmentedImageDatastore( ...
    inputSize(1:2), ...
    trainDS, ...
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
% 8. EXTRACT CNN DEEP FEATURES
% ============================================================
%
% Use MobileNetV2 global average pooling layer.
%
% This produces a compact deep representation rather than
% using the final 5-class prediction output.
% ============================================================

deepLayer = "global_average_pooling2d_1";

fprintf('\nExtracting deep CNN features...\n');

fprintf('Layer: %s\n',deepLayer);

tic;

deepTrain = activations( ...
    trainedNet, ...
    augTrainDS, ...
    deepLayer, ...
    'OutputAs','rows', ...
    'ExecutionEnvironment','gpu');

deepVal = activations( ...
    trainedNet, ...
    augValDS, ...
    deepLayer, ...
    'OutputAs','rows', ...
    'ExecutionEnvironment','gpu');

deepTest = activations( ...
    trainedNet, ...
    augTestDS, ...
    deepLayer, ...
    'OutputAs','rows', ...
    'ExecutionEnvironment','gpu');

featureTime = toc;

fprintf('Deep feature extraction completed.\n');
fprintf('Time: %.2f minutes\n',featureTime/60);

fprintf('Deep feature dimension: %d\n',size(deepTrain,2));

%% ============================================================
% 9. GET HANDCRAFTED FEATURES
% ============================================================

fprintf('\nPreparing handcrafted features...\n');

% Match segmentation rows using image ID

segIDs = erase(string(S.imageName),".png");

trainIDs = erase( ...
    string(trainTable.imageID), ...
    ".png");

valIDs = erase( ...
    string(valTable.imageID), ...
    ".png");

testIDs = erase( ...
    string(testTable.imageID), ...
    ".png");

% Find matching rows

[~,trainLoc] = ismember(trainIDs,segIDs);

[~,valLoc] = ismember(valIDs,segIDs);

[~,testLoc] = ismember(testIDs,segIDs);

if any(trainLoc == 0) || ...
   any(valLoc == 0) || ...
   any(testLoc == 0)

    error('Could not match some images to segmentation features.');

end

%% Handcrafted features

featureColumns = { ...
    'vesselCoverage', ...
    'lesionCoverage', ...
    'totalLesionArea', ...
    'lesionCount', ...
    'brightLesionCount', ...
    'darkLesionCount', ...
    'meanLesionArea'};

handTrain = zeros(height(trainTable),7);
handVal   = zeros(height(valTable),7);
handTest  = zeros(height(testTable),7);

for k = 1:7

    handTrain(:,k) = ...
        S.(featureColumns{k})(trainLoc);

    handVal(:,k) = ...
        S.(featureColumns{k})(valLoc);

    handTest(:,k) = ...
        S.(featureColumns{k})(testLoc);

end

%% ============================================================
% 10. NORMALIZE HANDCRAFTED FEATURES
% ============================================================

% featureMean/featureStd were calculated during the original
% grading preparation.

handTrainNorm = ...
    (handTrain - featureMean) ./ featureStd;

handValNorm = ...
    (handVal - featureMean) ./ featureStd;

handTestNorm = ...
    (handTest - featureMean) ./ featureStd;

%% ============================================================
% 11. NORMALIZE DEEP FEATURES
% ============================================================

deepMean = mean(deepTrain,1);

deepStd = std(deepTrain,0,1);

deepStd(deepStd == 0) = 1;

deepTrainNorm = ...
    (deepTrain - deepMean) ./ deepStd;

deepValNorm = ...
    (deepVal - deepMean) ./ deepStd;

deepTestNorm = ...
    (deepTest - deepMean) ./ deepStd;

%% ============================================================
% 12. FEATURE FUSION
% ============================================================

XTrain = [ ...
    deepTrainNorm, ...
    handTrainNorm];

XVal = [ ...
    deepValNorm, ...
    handValNorm];

XTest = [ ...
    deepTestNorm, ...
    handTestNorm];

fprintf('\n====================================================\n');
fprintf('              FEATURE FUSION\n');
fprintf('====================================================\n');

fprintf('Deep features         : %d\n',size(deepTrain,2));

fprintf('Handcrafted features  : %d\n',size(handTrain,2));

fprintf('Fused features        : %d\n',size(XTrain,2));

%% ============================================================
% 13. TRAIN MULTICLASS CLASSIFIER
% ============================================================
%
% Use ECOC + linear SVM.
%
% Class-dependent costs compensate for class imbalance.
% ============================================================

fprintf('\nTraining multiclass fusion classifier...\n');

classNames = categorical( ...
    {'Grade0','Grade1','Grade2','Grade3','Grade4'});

classCounts = zeros(5,1);

for k = 1:5
    classCounts(k) = ...
        sum(trainLabels == classNames(k));
end

%% Inverse-frequency weighting

classWeights = ...
    sum(classCounts) ./ ...
    (5 * classCounts);

fprintf('\nClass weights:\n');

for k = 1:5

    fprintf('%s : %.3f\n', ...
        string(classNames(k)), ...
        classWeights(k));

end

costMatrix = zeros(5);

for r = 1:5

    for c = 1:5

        if r ~= c

            costMatrix(r,c) = ...
                classWeights(r);

        end

    end

end

%% Train ECOC

tic;

fusionModel = fitcecoc( ...
    XTrain, ...
    trainLabels, ...
    'Learners','linear', ...
    'Coding','onevsall', ...
    'Cost',costMatrix);

classifierTime = toc;

fprintf('\nFusion classifier training completed.\n');
fprintf('Training time: %.2f seconds\n',classifierTime);

%% ============================================================
% 14. VALIDATION PREDICTION
% ============================================================

fprintf('\nRunning validation prediction...\n');

valPred = predict( ...
    fusionModel, ...
    XVal);

valAccuracy = ...
    mean(valPred == valLabels);

fprintf('Fusion validation accuracy: %.2f%%\n', ...
    valAccuracy*100);

%% ============================================================
% 15. TEST PREDICTION
% ============================================================

fprintf('\nRunning final fusion test prediction...\n');

testPred = predict( ...
    fusionModel, ...
    XTest);

testAccuracy = ...
    mean(testPred == testLabels);

fprintf('Fusion test accuracy: %.2f%%\n', ...
    testAccuracy*100);

%% ============================================================
% 16. CONFUSION MATRIX
% ============================================================

figure( ...
    'Name','Hybrid Fusion Confusion Matrix', ...
    'NumberTitle','off');

cm = confusionchart( ...
    testLabels, ...
    testPred);

cm.Title = ...
    'Hybrid CNN + Handcrafted Features';

cm.RowSummary = 'row-normalized';

cm.ColumnSummary = 'column-normalized';

%% ============================================================
% 17. PER-CLASS RECALL
% ============================================================

C = confusionmat( ...
    testLabels, ...
    testPred);

classRecall = zeros(5,1);

for k = 1:5

    denominator = ...
        sum(C(k,:));

    if denominator > 0

        classRecall(k) = ...
            C(k,k) / denominator;

    end

end

fprintf('\nPER-CLASS RECALL - FUSION MODEL\n');
fprintf('-------------------------------\n');

for k = 1:5

    fprintf('%s : %.2f%%\n', ...
        string(classNames(k)), ...
        classRecall(k)*100);

end

balancedAccuracy = ...
    mean(classRecall);

fprintf('\nFusion balanced accuracy: %.2f%%\n', ...
    balancedAccuracy*100);

%% ============================================================
% 18. COMPARE WITH CNN BASELINE
% ============================================================

if isfield(M,'testAccuracy')

    cnnBaselineAccuracy = ...
        M.testAccuracy;

else

    cnnBaselineAccuracy = NaN;

end

if isfield(M,'balancedAccuracy')

    cnnBaselineBalancedAccuracy = ...
        M.balancedAccuracy;

else

    cnnBaselineBalancedAccuracy = NaN;

end

fprintf('\n====================================================\n');
fprintf('             MODEL COMPARISON\n');
fprintf('====================================================\n');

fprintf('CNN-only test accuracy       : %.2f%%\n', ...
    cnnBaselineAccuracy*100);

fprintf('Fusion test accuracy         : %.2f%%\n', ...
    testAccuracy*100);

fprintf('CNN-only balanced accuracy   : %.2f%%\n', ...
    cnnBaselineBalancedAccuracy*100);

fprintf('Fusion balanced accuracy     : %.2f%%\n', ...
    balancedAccuracy*100);

fprintf('Accuracy improvement         : %.2f percentage points\n', ...
    (testAccuracy-cnnBaselineAccuracy)*100);

fprintf('Balanced accuracy improvement: %.2f percentage points\n', ...
    (balancedAccuracy-cnnBaselineBalancedAccuracy)*100);

%% ============================================================
% 19. SAVE FUSION MODEL
% ============================================================

fusionFile = fullfile( ...
    outputFolder, ...
    'Hybrid_CNN_Handcrafted_Model.mat');

save( ...
    fusionFile, ...
    'fusionModel', ...
    'deepMean', ...
    'deepStd', ...
    'featureMean', ...
    'featureStd', ...
    'featureColumns', ...
    'classNames', ...
    'classRecall', ...
    'balancedAccuracy', ...
    'valAccuracy', ...
    'testAccuracy', ...
    'cnnBaselineAccuracy', ...
    'cnnBaselineBalancedAccuracy');

fprintf('\nFusion model saved to:\n%s\n',fusionFile);

%% ============================================================
% 20. SAVE TEST PREDICTIONS
% ============================================================

PredictionTable = table( ...
    testTable.imageID, ...
    testTable.diagnosis, ...
    string(testLabels), ...
    string(testPred), ...
    'VariableNames', { ...
    'imageID', ...
    'trueGrade', ...
    'trueLabel', ...
    'predictedLabel'});

predictionFile = fullfile( ...
    outputFolder, ...
    'Hybrid_Test_Predictions.csv');

writetable( ...
    PredictionTable, ...
    predictionFile);

%% ============================================================
% 21. FINAL SUMMARY
% ============================================================

fprintf('\n====================================================\n');
fprintf('          FEATURE FUSION COMPLETE\n');
fprintf('====================================================\n');

fprintf('Training images          : %d\n', ...
    height(trainTable));

fprintf('Validation images        : %d\n', ...
    height(valTable));

fprintf('Test images              : %d\n', ...
    height(testTable));

fprintf('\nDeep features            : %d\n', ...
    size(deepTrain,2));

fprintf('Handcrafted features     : %d\n', ...
    size(handTrain,2));

fprintf('Fused feature dimension  : %d\n', ...
    size(XTrain,2));

fprintf('\nCNN-only test accuracy   : %.2f%%\n', ...
    cnnBaselineAccuracy*100);

fprintf('Fusion test accuracy     : %.2f%%\n', ...
    testAccuracy*100);

fprintf('CNN-only balanced acc.   : %.2f%%\n', ...
    cnnBaselineBalancedAccuracy*100);

fprintf('Fusion balanced accuracy : %.2f%%\n', ...
    balancedAccuracy*100);

fprintf('\nModel saved:\n%s\n',fusionFile);

fprintf('Predictions saved:\n%s\n',predictionFile);

fprintf('====================================================\n');