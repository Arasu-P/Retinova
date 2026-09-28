%% ============================================================
%  ResNet-50 Diabetic Retinopathy Classification
%  APTOS Accepted + Enhanced Dataset
%
%  MATLAB R2026a
%
%  Model:
%       ImageNet-pretrained ResNet-50
%
%  Classes:
%       Grade0, Grade1, Grade2, Grade3, Grade4
%
%  Dataset:
%       Accepted APTOS images
%       Enhanced images
%
%  Split:
%       TRAIN       = 1751
%       VALIDATION  = 375
%       TEST        = 376
%
%  Training:
%       Transfer learning
%       Frozen pretrained layers
%       Train classification head
%       GPU
%
% ============================================================

clear;
clc;
close all;

fprintf('\n');
fprintf('============================================================\n');
fprintf('        RESNET-50 DIABETIC RETINOPATHY CLASSIFIER\n');
fprintf('============================================================\n\n');


%% ============================================================
% 1. PROJECT PATHS
% ============================================================

projectRoot = ...
    'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB';

gradingRoot = fullfile( ...
    projectRoot, ...
    'results', ...
    'APTOS_Grading');

preparedCSV = fullfile( ...
    gradingRoot, ...
    'APTOS_Grading_Prepared.csv');

enhancedFolder = fullfile( ...
    projectRoot, ...
    'results', ...
    'APTOS_Enhanced', ...
    'images');

modelOutput = fullfile( ...
    gradingRoot, ...
    'ResNet50_DR_Model.mat');

resultsCSV = fullfile( ...
    gradingRoot, ...
    'ResNet50_Test_Predictions.csv');


fprintf('Project root:\n%s\n\n', projectRoot);


%% ============================================================
% 2. CHECK REQUIRED FILES/FOLDERS
% ============================================================

if ~isfile(preparedCSV)
    error('Prepared CSV not found:\n%s', preparedCSV);
end

if ~isfolder(enhancedFolder)
    error('Enhanced image folder not found:\n%s', enhancedFolder);
end


%% ============================================================
% 3. LOAD PREPARED GRADING DATA
% ============================================================

fprintf('Loading prepared grading data...\n');

T = readtable(preparedCSV);

fprintf('Total rows in CSV: %d\n\n', height(T));


%% ============================================================
% 4. VERIFY REQUIRED COLUMNS
% ============================================================

requiredColumns = { ...
    'imageID', ...
    'enhancedImage', ...
    'diagnosis', ...
    'split'};

availableColumns = T.Properties.VariableNames;

for k = 1:numel(requiredColumns)

    if ~ismember(requiredColumns{k}, availableColumns)

        error( ...
            'Required column "%s" is missing from CSV.', ...
            requiredColumns{k});

    end

end

fprintf('Required CSV columns verified.\n');


%% ============================================================
% 5. BUILD FULL IMAGE PATHS
% ============================================================

imagePaths = fullfile( ...
    enhancedFolder, ...
    T.enhancedImage);


%% ============================================================
% 6. VERIFY IMAGE FILES
% ============================================================

existsMask = isfile(imagePaths);

numFound = sum(existsMask);
numMissing = sum(~existsMask);

fprintf('\nImage verification:\n');
fprintf('Images found   : %d\n', numFound);
fprintf('Images missing : %d\n', numMissing);

if numMissing > 0

    fprintf('\nWARNING: Removing rows for missing images.\n');

    T = T(existsMask, :);

    imagePaths = imagePaths(existsMask);

end

fprintf('\nRemaining images: %d\n', height(T));


%% ============================================================
% 7. CREATE 5 DR CATEGORIES
% ============================================================

fprintf('\nCreating DR class labels...\n');

diagnosisNumeric = T.diagnosis;

labels = categorical( ...
    diagnosisNumeric, ...
    [0 1 2 3 4], ...
    {'Grade0','Grade1','Grade2','Grade3','Grade4'});


classNamesDR = categories(labels);

numClasses = numel(classNamesDR);


fprintf('\nDR classes:\n');

for k = 1:numClasses
    fprintf('%d -> %s\n', k-1, classNamesDR{k});
end


%% ============================================================
% 8. OVERALL CLASS DISTRIBUTION
% ============================================================

overallCounts = countcats(labels);

fprintf('\nOverall class distribution:\n');

for k = 1:numClasses

    fprintf( ...
        '%s : %d\n', ...
        classNamesDR{k}, ...
        overallCounts(k));

end


%% ============================================================
% 9. CREATE TRAIN / VALIDATION / TEST MASKS
% ============================================================

splitText = upper(string(T.split));

trainMask = splitText == "TRAIN";
valMask   = splitText == "VALIDATION";
testMask  = splitText == "TEST";


fprintf('\n============================================================\n');
fprintf('DATASET SPLIT\n');
fprintf('============================================================\n');

fprintf('Training     : %d\n', sum(trainMask));
fprintf('Validation   : %d\n', sum(valMask));
fprintf('Test         : %d\n', sum(testMask));


%% ============================================================
% 10. CREATE DATASTORES
% ============================================================

trainPaths = imagePaths(trainMask);
valPaths   = imagePaths(valMask);
testPaths  = imagePaths(testMask);

trainLabels = labels(trainMask);
valLabels   = labels(valMask);
testLabels  = labels(testMask);


imdsTrain = imageDatastore( ...
    trainPaths, ...
    'Labels', trainLabels);

imdsValidation = imageDatastore( ...
    valPaths, ...
    'Labels', valLabels);

imdsTest = imageDatastore( ...
    testPaths, ...
    'Labels', testLabels);


fprintf('\nImage datastores created successfully.\n');


%% ============================================================
% 11. SHOW TRAINING CLASS DISTRIBUTION
% ============================================================

trainCounts = countcats(trainLabels);

fprintf('\nTraining class distribution:\n');

for k = 1:numClasses

    fprintf( ...
        '%s : %d\n', ...
        classNamesDR{k}, ...
        trainCounts(k));

end


%% ============================================================
% 12. SHOW VALIDATION CLASS DISTRIBUTION
% ============================================================

valCounts = countcats(valLabels);

fprintf('\nValidation class distribution:\n');

for k = 1:numClasses

    fprintf( ...
        '%s : %d\n', ...
        classNamesDR{k}, ...
        valCounts(k));

end


%% ============================================================
% 13. SHOW TEST CLASS DISTRIBUTION
% ============================================================

testCounts = countcats(testLabels);

fprintf('\nTest class distribution:\n');

for k = 1:numClasses

    fprintf( ...
        '%s : %d\n', ...
        classNamesDR{k}, ...
        testCounts(k));

end


%% ============================================================
% 14. CHECK GPU
% ============================================================

fprintf('\n============================================================\n');
fprintf('GPU CHECK\n');
fprintf('============================================================\n');

try

    g = gpuDevice;

    fprintf('GPU Name           : %s\n', g.Name);
    fprintf('Compute Capability : %s\n', g.ComputeCapability);

    fprintf( ...
        'Total GPU Memory  : %.2f GB\n', ...
        g.TotalMemory / 1e9);

    fprintf( ...
        'Available Memory  : %.2f GB\n', ...
        g.AvailableMemory / 1e9);

catch ME

    error( ...
        'GPU initialization failed:\n%s', ...
        ME.message);

end


%% ============================================================
% 15. LOAD RESNET-50 DIRECTLY FOR 5 CLASSES
% ============================================================

fprintf('\n============================================================\n');
fprintf('LOADING PRETRAINED RESNET-50\n');
fprintf('============================================================\n');

%
% IMPORTANT:
% NumClasses=5 automatically adapts the classification head.
%
% This is the R2026a-compatible transfer-learning workflow.
%

net = imagePretrainedNetwork( ...
    "resnet50", ...
    NumClasses=numClasses);


fprintf('ResNet-50 loaded successfully.\n');


%% ============================================================
% 16. INSPECT NETWORK
% ============================================================

inputSize = net.Layers(1).InputSize;

fprintf('\nNetwork input size:\n');
fprintf('%d x %d x %d\n', ...
    inputSize(1), ...
    inputSize(2), ...
    inputSize(3));


learnableCount = 0;

for k = 1:height(net.Learnables)

    learnableCount = learnableCount + ...
        numel(net.Learnables.Value{k});

end

fprintf( ...
    'Number of learnable parameters: %.2f million\n', ...
    learnableCount / 1e6);


%% ============================================================
% 17. IDENTIFY RESNET-50 CLASSIFICATION HEAD
% ============================================================

fprintf('\nIdentifying classification head...\n');

% ResNet-50 classification head
headLayerName = "fc1000";

fprintf('Classification head: %s\n', headLayerName);

% Find learnable parameters belonging to fc1000
headRows = strcmp( ...
    string(net.Learnables.Layer), ...
    headLayerName);

if ~any(headRows)
    error('Could not find classification layer "%s".', headLayerName);
end

headLearnableNames = ...
    string(net.Learnables.Parameter(headRows));

fprintf('Head learnable parameters:\n');

for k = 1:numel(headLearnableNames)
    fprintf('  %s/%s\n', ...
        headLayerName, ...
        headLearnableNames(k));
end

%% ============================================================
% 18. FREEZE ALL PRETRAINED PARAMETERS
% ============================================================

fprintf('\n============================================================\n');
fprintf('FREEZING PRETRAINED PARAMETERS\n');
fprintf('============================================================\n');

learnables = net.Learnables;

for k = 1:height(learnables)

    layerName = string(learnables.Layer(k));
    parameterName = string(learnables.Parameter(k));

    % Freeze every parameter except fc1000
    if layerName ~= headLayerName

        net = setLearnRateFactor( ...
            net, ...
            layerName, ...
            parameterName, ...
            0);

    end
end

fprintf('All pretrained parameters frozen.\n');


%% ============================================================
% 19. SET CLASSIFICATION HEAD LEARNING RATE
% ============================================================

fprintf('\nSetting classification head learning-rate factors...\n');

for k = 1:numel(headLearnableNames)

    parameterName = headLearnableNames(k);

    net = setLearnRateFactor( ...
        net, ...
        headLayerName, ...
        parameterName, ...
        10);

    fprintf( ...
        '%s/%s -> learning-rate factor = 10\n', ...
        headLayerName, ...
        parameterName);

end

fprintf('Classification head configured for training.\n');

%% ============================================================
%% 20. VERIFY LEARNING-RATE FACTORS

fprintf('\nClassification head learning-rate factors:\n');

for k = 1:numel(headLearnableNames)

    parameterName = headLearnableNames(k);

    fprintf('  %s/%s configured with LR factor = 10\n', ...
        headLayerName, parameterName);

end

fprintf('Learning-rate configuration verified.\n');


%% ============================================================
% 21. DATA AUGMENTATION
% ============================================================

fprintf('\n============================================================\n');
fprintf('DATA AUGMENTATION\n');
fprintf('============================================================\n');

augmenter = imageDataAugmenter( ...
    'RandRotation', [-8 8], ...
    'RandXTranslation', [-8 8], ...
    'RandYTranslation', [-8 8], ...
    'RandXScale', [0.95 1.05], ...
    'RandYScale', [0.95 1.05]);


%% ============================================================
% 22. CREATE AUGMENTED TRAINING DATASTORE
% ============================================================

augimdsTrain = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsTrain, ...
    'DataAugmentation', augmenter, ...
    'ColorPreprocessing', 'gray2rgb');


%% ============================================================
% 23. CREATE VALIDATION DATASTORE
% ============================================================

augimdsValidation = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsValidation, ...
    'ColorPreprocessing', 'gray2rgb');


%% ============================================================
% 24. CREATE TEST DATASTORE
% ============================================================

augimdsTest = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsTest, ...
    'ColorPreprocessing', 'gray2rgb');


fprintf('Training datastore ready.\n');
fprintf('Validation datastore ready.\n');
fprintf('Test datastore ready.\n');


%% ============================================================
% 25. TRAINING PARAMETERS
% ============================================================

miniBatchSize = 16;

numTrainImages = numel(trainLabels);

validationFrequency = max( ...
    1, ...
    floor(numTrainImages / miniBatchSize));


fprintf('\n============================================================\n');
fprintf('TRAINING CONFIGURATION\n');
fprintf('============================================================\n');

fprintf('Architecture          : ResNet-50\n');
fprintf('Input size            : 224 x 224 x 3\n');
fprintf('Number of classes     : 5\n');
fprintf('Mini-batch size       : %d\n', miniBatchSize);
fprintf('Maximum epochs        : 10\n');
fprintf('Initial learning rate : 1e-4\n');
fprintf('Optimizer             : Adam\n');
fprintf('Execution             : GPU\n');
fprintf('Validation frequency  : %d iterations\n', ...
    validationFrequency);


%% ============================================================
% 26. TRAINING OPTIONS
% ============================================================

options = trainingOptions( ...
    'adam', ...
    'InitialLearnRate', 1e-4, ...
    'MaxEpochs', 10, ...
    'MiniBatchSize', miniBatchSize, ...
    'Shuffle', 'every-epoch', ...
    'ValidationData', augimdsValidation, ...
    'ValidationFrequency', validationFrequency, ...
    'ValidationPatience', 3, ...
    'ExecutionEnvironment', 'gpu', ...
    'Verbose', true, ...
    'Plots', 'training-progress');


%% ============================================================
% 27. START TRAINING
% ============================================================

fprintf('\n');
fprintf('============================================================\n');
fprintf('             STARTING RESNET-50 TRAINING\n');
fprintf('============================================================\n\n');


trainingTimer = tic;


netTrained = trainnet( ...
    augimdsTrain, ...
    net, ...
    'crossentropy', ...
    options);


trainingTime = toc(trainingTimer);


fprintf('\n');
fprintf('============================================================\n');
fprintf('             TRAINING COMPLETED\n');
fprintf('============================================================\n');

fprintf( ...
    'Training time: %.2f minutes\n', ...
    trainingTime / 60);


%% ============================================================
% 28. VALIDATION PREDICTIONS
% ============================================================

fprintf('\nGenerating validation predictions...\n');

validationTimer = tic;


valScores = minibatchpredict( ...
    netTrained, ...
    augimdsValidation, ...
    'ExecutionEnvironment', 'gpu');


validationTime = toc(validationTimer);


fprintf( ...
    'Validation prediction time: %.2f seconds\n', ...
    validationTime);


%% ============================================================
% 29. CONVERT VALIDATION SCORES TO LABELS
% ============================================================

valPred = scores2label( ...
    valScores, ...
    classNamesDR);


%% ============================================================
% 30. VALIDATION METRICS
% ============================================================

valTrue = valLabels;

valAccuracy = mean( ...
    valPred == valTrue);


valCM = confusionmat( ...
    valTrue, ...
    valPred, ...
    'Order', classNamesDR);


valRecall = diag(valCM) ./ ...
    max(1, sum(valCM, 2));


valBalancedAccuracy = mean(valRecall);


fprintf('\n');
fprintf('============================================================\n');
fprintf('                VALIDATION RESULTS\n');
fprintf('============================================================\n');

fprintf( ...
    'Validation Accuracy          : %.2f %%\n', ...
    valAccuracy * 100);

fprintf( ...
    'Validation Balanced Accuracy : %.2f %%\n', ...
    valBalancedAccuracy * 100);


fprintf('\nValidation per-class recall:\n');

for k = 1:numClasses

    fprintf( ...
        '%s : %.2f %%\n', ...
        classNamesDR{k}, ...
        valRecall(k) * 100);

end


%% ============================================================
% 31. FINAL TEST PREDICTIONS
% ============================================================

fprintf('\n');
fprintf('============================================================\n');
fprintf('              FINAL TEST EVALUATION\n');
fprintf('============================================================\n');

fprintf('Generating test predictions...\n');


testTimer = tic;


testScores = minibatchpredict( ...
    netTrained, ...
    augimdsTest, ...
    'ExecutionEnvironment', 'gpu');


testInferenceTime = toc(testTimer);


fprintf( ...
    'Test prediction time: %.2f seconds\n', ...
    testInferenceTime);


%% ============================================================
% 32. CONVERT TEST SCORES TO LABELS
% ============================================================

testPred = scores2label( ...
    testScores, ...
    classNamesDR);


testTrue = testLabels;


%% ============================================================
% 33. TEST ACCURACY
% ============================================================

testAccuracy = mean( ...
    testPred == testTrue);


%% ============================================================
% 34. TEST CONFUSION MATRIX
% ============================================================

testCM = confusionmat( ...
    testTrue, ...
    testPred, ...
    'Order', classNamesDR);


%% ============================================================
% 35. TEST RECALL
% ============================================================

testRecall = diag(testCM) ./ ...
    max(1, sum(testCM, 2));


%% ============================================================
% 36. TEST PRECISION
% ============================================================

testPrecision = diag(testCM) ./ ...
    max(1, sum(testCM, 1)');


%% ============================================================
% 37. TEST F1 SCORE
% ============================================================

testF1 = 2 .* ...
    (testPrecision .* testRecall) ./ ...
    max(eps, testPrecision + testRecall);


%% ============================================================
% 38. BALANCED ACCURACY
% ============================================================

testBalancedAccuracy = mean(testRecall);


%% ============================================================
% 39. MACRO F1
% ============================================================

macroF1 = mean(testF1);


%% ============================================================
% 40. DISPLAY FINAL TEST RESULTS
% ============================================================

fprintf('\n');
fprintf('============================================================\n');
fprintf('             RESNET-50 FINAL TEST RESULTS\n');
fprintf('============================================================\n');

fprintf( ...
    'Test Accuracy          : %.2f %%\n', ...
    testAccuracy * 100);

fprintf( ...
    'Balanced Accuracy      : %.2f %%\n', ...
    testBalancedAccuracy * 100);

fprintf( ...
    'Macro F1               : %.4f\n', ...
    macroF1);

fprintf( ...
    'Total test images      : %d\n', ...
    numel(testLabels));

fprintf( ...
    'Total inference time   : %.2f seconds\n', ...
    testInferenceTime);

fprintf( ...
    'Average inference/img  : %.4f seconds\n', ...
    testInferenceTime / numel(testLabels));


%% ============================================================
% 41. PER-CLASS PERFORMANCE
% ============================================================

fprintf('\n');
fprintf('============================================================\n');
fprintf('             PER-CLASS PERFORMANCE\n');
fprintf('============================================================\n');

fprintf( ...
    '%-10s %12s %12s %12s\n', ...
    'Class', ...
    'Precision', ...
    'Recall', ...
    'F1');


for k = 1:numClasses

    fprintf( ...
        '%-10s %11.2f%% %11.2f%% %12.4f\n', ...
        classNamesDR{k}, ...
        testPrecision(k) * 100, ...
        testRecall(k) * 100, ...
        testF1(k));

end


%% ============================================================
% 42. CONFUSION MATRIX FIGURE
% ============================================================

figure( ...
    'Name', ...
    'ResNet-50 Confusion Matrix');

confusionchart( ...
    testCM, ...
    classNamesDR);

title( ...
    'ResNet-50 - APTOS Test Confusion Matrix');


%% ============================================================
% 43. CREATE TEST RESULTS TABLE
% ============================================================

testImageIDs = T.imageID(testMask);


TestResults = table( ...
    testImageIDs, ...
    testTrue, ...
    testPred, ...
    'VariableNames', ...
    {'imageID', 'TrueLabel', 'PredictedLabel'});


%% ============================================================
% 44. SAVE TEST PREDICTIONS
% ============================================================

writetable( ...
    TestResults, ...
    resultsCSV);


fprintf('\nTest predictions saved to:\n');
fprintf('%s\n', resultsCSV);


%% ============================================================
% 45. SAVE METRICS
% ============================================================

metrics = struct();


metrics.architecture = 'ResNet-50';

metrics.inputSize = inputSize;

metrics.numClasses = numClasses;

metrics.classNames = classNamesDR;


metrics.numTrainImages = ...
    numel(trainLabels);

metrics.numValidationImages = ...
    numel(valLabels);

metrics.numTestImages = ...
    numel(testLabels);


metrics.validationAccuracy = ...
    valAccuracy;

metrics.validationBalancedAccuracy = ...
    valBalancedAccuracy;


metrics.testAccuracy = ...
    testAccuracy;

metrics.testBalancedAccuracy = ...
    testBalancedAccuracy;

metrics.testMacroF1 = ...
    macroF1;


metrics.testPrecision = ...
    testPrecision;

metrics.testRecall = ...
    testRecall;

metrics.testF1 = ...
    testF1;


metrics.trainingTimeSeconds = ...
    trainingTime;

metrics.validationInferenceTimeSeconds = ...
    validationTime;

metrics.testInferenceTimeSeconds = ...
    testInferenceTime;


%% ============================================================
% 46. SAVE TRAINED MODEL
% ============================================================

save( ...
    modelOutput, ...
    'netTrained', ...
    'metrics', ...
    'testCM', ...
    'classNamesDR', ...
    '-v7.3');


fprintf('\nTrained model saved to:\n');
fprintf('%s\n', modelOutput);


%% ============================================================
% 47. FINAL SUMMARY
% ============================================================

fprintf('\n');
fprintf('============================================================\n');
fprintf('                 FINAL SUMMARY\n');
fprintf('============================================================\n');

fprintf('Architecture       : ResNet-50\n');
fprintf('Input              : 224 x 224 x 3\n');
fprintf('Classes            : 5\n');

fprintf('\nDataset:\n');

fprintf( ...
    'Training           : %d\n', ...
    numel(trainLabels));

fprintf( ...
    'Validation         : %d\n', ...
    numel(valLabels));

fprintf( ...
    'Test               : %d\n', ...
    numel(testLabels));


fprintf('\nPerformance:\n');

fprintf( ...
    'Validation Accuracy       : %.2f %%\n', ...
    valAccuracy * 100);

fprintf( ...
    'Validation Balanced Acc.  : %.2f %%\n', ...
    valBalancedAccuracy * 100);

fprintf( ...
    'Test Accuracy             : %.2f %%\n', ...
    testAccuracy * 100);

fprintf( ...
    'Test Balanced Accuracy    : %.2f %%\n', ...
    testBalancedAccuracy * 100);

fprintf( ...
    'Test Macro F1             : %.4f\n', ...
    macroF1);


fprintf('\nImportant minority-class recall:\n');

fprintf( ...
    'Grade 3 Recall            : %.2f %%\n', ...
    testRecall(4) * 100);

fprintf( ...
    'Grade 4 Recall            : %.2f %%\n', ...
    testRecall(5) * 100);


fprintf('\nRuntime:\n');

fprintf( ...
    'Training time             : %.2f minutes\n', ...
    trainingTime / 60);

fprintf( ...
    'Test inference time       : %.2f seconds\n', ...
    testInferenceTime);

fprintf( ...
    'Average inference/image   : %.4f seconds\n', ...
    testInferenceTime / numel(testLabels));


fprintf('\n');
fprintf('============================================================\n');
fprintf('          RESNET-50 EXPERIMENT COMPLETED\n');
fprintf('============================================================\n\n');