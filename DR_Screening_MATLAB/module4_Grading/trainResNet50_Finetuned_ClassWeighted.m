%% ============================================================
%  RESNET-50 FINE-TUNED + CLASS-WEIGHTED DR CLASSIFIER
%  SIH26038 - Explainable AI for Diabetic Retinopathy Screening
%
%  Experiment 3:
%  - ResNet-50 pretrained ImageNet backbone
%  - Fine-tune final ResNet-50 residual stage (res5)
%  - Train 5-class DR classifier
%  - Class-weighted cross-entropy
%  - GPU training
%
%  IMPORTANT:
%  - Uses the SAME prepared dataset/split as the previous experiments
%  - Test set is evaluated only after training
%  ============================================================

clear;
clc;
close all;

fprintf('\n');
fprintf('============================================================\n');
fprintf(' RESNET-50 FINE-TUNED + CLASS-WEIGHTED DR CLASSIFIER\n');
fprintf('============================================================\n');


%% ============================================================
% 1. PROJECT PATH
% =============================================================

projectRoot = 'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB';

gradingFolder = fullfile(projectRoot, 'module4_Grading');
resultsFolder = fullfile(projectRoot, 'results', 'APTOS_Grading');

preparedCSV = fullfile(resultsFolder, ...
    'APTOS_Grading_Prepared.csv');

enhancedImageFolder = fullfile( ...
    projectRoot, ...
    'results', ...
    'APTOS_Enhanced', ...
    'images');

if ~isfolder(projectRoot)
    error('Project root not found:\n%s', projectRoot);
end

if ~isfile(preparedCSV)
    error('Prepared grading CSV not found:\n%s', preparedCSV);
end

if ~isfolder(enhancedImageFolder)
    error('Enhanced image folder not found:\n%s', enhancedImageFolder);
end

fprintf('\nProject root:\n%s\n', projectRoot);


%% ============================================================
% 2. LOAD PREPARED GRADING DATA
% =============================================================

fprintf('\nLoading prepared grading data...\n');

T = readtable(preparedCSV);

fprintf('Total rows in CSV: %d\n', height(T));


%% ============================================================
% 3. VERIFY REQUIRED COLUMNS
% =============================================================

requiredColumns = {'enhancedImage','diagnosis','split'};

for k = 1:numel(requiredColumns)

    if ~ismember(requiredColumns{k}, T.Properties.VariableNames)

        error(['Required column "%s" not found in ', ...
               'APTOS_Grading_Prepared.csv.'], ...
               requiredColumns{k});

    end

end

fprintf('\nRequired CSV columns verified.\n');


%% ============================================================
% 4. GET ENHANCED IMAGE NAMES
% =============================================================

imageNames = string(T.enhancedImage);


%% ============================================================
% 5. VERIFY IMAGE FILES
% =============================================================

fprintf('\nImage verification:\n');

imageFiles = strings(height(T),1);
existsMask = false(height(T),1);

for k = 1:height(T)

    candidate = fullfile( ...
        enhancedImageFolder, ...
        imageNames(k));

    if isfile(candidate)

        imageFiles(k) = string(candidate);
        existsMask(k) = true;

    end

end

fprintf('Images found   : %d\n', sum(existsMask));
fprintf('Images missing : %d\n', sum(~existsMask));

if any(~existsMask)

    warning('%d images are missing and will be removed.', ...
        sum(~existsMask));

    T = T(existsMask,:);
    imageFiles = imageFiles(existsMask);

end

fprintf('\nRemaining images: %d\n', height(T));


%% ============================================================
% 6. CREATE DR CLASS LABELS
% =============================================================

fprintf('\nCreating DR class labels...\n');

diagnosisNumeric = double(T.diagnosis);
diagnosisNumeric = round(diagnosisNumeric);

if any(~ismember(diagnosisNumeric,0:4))

    error('Diagnosis column contains values outside Grade 0-4.');

end

classNamesDR = categorical( ...
    diagnosisNumeric, ...
    0:4, ...
    {'Grade0','Grade1','Grade2','Grade3','Grade4'});

classNamesDR = reordercats( ...
    classNamesDR, ...
    {'Grade0','Grade1','Grade2','Grade3','Grade4'});


fprintf('\nDR classes:\n');

for k = 1:5

    fprintf('%d -> Grade%d\n', ...
        k-1, k-1);

end


%% ============================================================
% 7. OVERALL CLASS DISTRIBUTION
% =============================================================

fprintf('\nOverall class distribution:\n');

for k = 1:5

    className = sprintf('Grade%d', k-1);

    countClass = sum(classNamesDR == className);

    fprintf('%-8s : %d\n', ...
        className, countClass);

end


%% ============================================================
% 8. READ EXISTING DATASET SPLIT
% =============================================================

splitLabels = upper(string(T.split));

trainMask = splitLabels == "TRAIN";
valMask   = splitLabels == "VALIDATION";
testMask  = splitLabels == "TEST";

if sum(trainMask) == 0 || ...
   sum(valMask) == 0 || ...
   sum(testMask) == 0

    error(['Expected TRAIN, VALIDATION and TEST labels ', ...
           'in the split column.']);

end


fprintf('\n');
fprintf('============================================================\n');
fprintf('DATASET SPLIT\n');
fprintf('============================================================\n');

fprintf('Training     : %d\n', sum(trainMask));
fprintf('Validation   : %d\n', sum(valMask));
fprintf('Test         : %d\n', sum(testMask));


%% ============================================================
% 9. CREATE IMAGE DATASTORES
% =============================================================

trainFiles = imageFiles(trainMask);
valFiles   = imageFiles(valMask);
testFiles  = imageFiles(testMask);

trainLabels = classNamesDR(trainMask);
valLabels   = classNamesDR(valMask);
testLabels  = classNamesDR(testMask);

imdsTrain = imageDatastore( ...
    cellstr(trainFiles), ...
    'Labels', trainLabels);

imdsValidation = imageDatastore( ...
    cellstr(valFiles), ...
    'Labels', valLabels);

imdsTest = imageDatastore( ...
    cellstr(testFiles), ...
    'Labels', testLabels);

fprintf('\nImage datastores created successfully.\n');


%% ============================================================
% 10. DISPLAY SPLIT DISTRIBUTIONS
% =============================================================

fprintf('\nTraining class distribution:\n');

for k = 1:5

    className = sprintf('Grade%d', k-1);

    fprintf('%-8s : %d\n', ...
        className, ...
        sum(trainLabels == className));

end


fprintf('\nValidation class distribution:\n');

for k = 1:5

    className = sprintf('Grade%d', k-1);

    fprintf('%-8s : %d\n', ...
        className, ...
        sum(valLabels == className));

end


fprintf('\nTest class distribution:\n');

for k = 1:5

    className = sprintf('Grade%d', k-1);

    fprintf('%-8s : %d\n', ...
        className, ...
        sum(testLabels == className));

end
%% ============================================================
% 11. GPU CHECK
% =============================================================

fprintf('\n');
fprintf('============================================================\n');
fprintf('GPU CHECK\n');
fprintf('============================================================\n');

if gpuDeviceCount == 0

    error('No compatible GPU detected.');

end

g = gpuDevice;

fprintf('GPU Name           : %s\n', g.Name);
fprintf('Compute Capability : %s\n', g.ComputeCapability);
fprintf('Total GPU Memory  : %.2f GB\n', ...
    g.TotalMemory/1024^3);
fprintf('Available Memory  : %.2f GB\n', ...
    g.AvailableMemory/1024^3);


%% ============================================================
% 12. LOAD PRETRAINED RESNET-50
% =============================================================

fprintf('\n');
fprintf('============================================================\n');
fprintf('LOADING PRETRAINED RESNET-50\n');
fprintf('============================================================\n');

net = imagePretrainedNetwork( ...
    "resnet50", ...
    NumClasses=5);

fprintf('\nResNet-50 loaded successfully.\n');

inputSize = net.Layers(1).InputSize;

fprintf('\nNetwork input size:\n');
fprintf('%d x %d x %d\n', ...
    inputSize(1), ...
    inputSize(2), ...
    inputSize(3));

fprintf('Number of learnable parameters: %.2f million\n', ...
    height(net.Learnables)/1e6);


%% ============================================================
% 13. IDENTIFY CLASSIFICATION HEAD
% =============================================================

fprintf('\nIdentifying classification head...\n');

headLayerName = "fc1000";

fprintf('Classification head: %s\n', ...
    headLayerName);

headRows = strcmp( ...
    string(net.Learnables.Layer), ...
    headLayerName);

if ~any(headRows)

    error('Classification head "%s" was not found.', ...
        headLayerName);

end

headLearnableNames = string( ...
    net.Learnables.Parameter(headRows));

fprintf('Head learnable parameters:\n');

for k = 1:numel(headLearnableNames)

    fprintf('  %s/%s\n', ...
        headLayerName, ...
        headLearnableNames(k));

end


%% ============================================================
% 14. IDENTIFY RES5 PARAMETERS
% =============================================================

fprintf('\n');
fprintf('Identifying ResNet-50 final residual stage...\n');

allLearnableLayers = string(net.Learnables.Layer);

% Final residual stage begins with res5
res5Mask = startsWith(allLearnableLayers, "res5");

res5Layers = unique(allLearnableLayers(res5Mask));

fprintf('\nRes5 learnable layers found: %d\n', ...
    numel(res5Layers));

for k = 1:numel(res5Layers)

    fprintf('  %s\n', res5Layers(k));

end

if ~any(res5Mask)

    error('No res5 learnable parameters were found.');

end


%% ============================================================
% 15. FREEZE EARLIER RESNET PARAMETERS
% =============================================================

fprintf('\n');
fprintf('============================================================\n');
fprintf('CONFIGURING FINE-TUNING\n');
fprintf('============================================================\n');

learnables = net.Learnables;

for k = 1:height(learnables)

    layerName = string(learnables.Layer(k));
    parameterName = string(learnables.Parameter(k));

    % Everything is frozen initially
    net = setLearnRateFactor( ...
        net, ...
        layerName, ...
        parameterName, ...
        0);

end

fprintf('All pretrained parameters initially frozen.\n');


%% ============================================================
% 16. ENABLE RES5 FINE-TUNING
% =============================================================

for k = 1:height(learnables)

    layerName = string(learnables.Layer(k));
    parameterName = string(learnables.Parameter(k));

    if startsWith(layerName,"res5")

        net = setLearnRateFactor( ...
            net, ...
            layerName, ...
            parameterName, ...
            0.1);

    end

end

fprintf('\nRes5 stage configured for fine-tuning.\n');
fprintf('Res5 learning-rate factor = 0.1\n');


%% ============================================================
% 17. ENABLE CLASSIFICATION HEAD TRAINING
% =============================================================

for k = 1:numel(headLearnableNames)

    parameterName = headLearnableNames(k);

    net = setLearnRateFactor( ...
        net, ...
        headLayerName, ...
        parameterName, ...
        10);

end

fprintf('Classification head learning-rate factor = 10\n');


%% ============================================================
% 18. VERIFY LEARNING-RATE CONFIGURATION
% =============================================================

fprintf('\n');
fprintf('Learning-rate configuration:\n');

fprintf('  Earlier backbone : 0\n');
fprintf('  Res5 stage       : 0.1\n');
fprintf('  Classification   : 10\n');


%% ============================================================
% 19. CLASS WEIGHTS
% ============================================================

fprintf('\n');
fprintf('============================================================\n');
fprintf('CLASS-WEIGHTED TRAINING\n');
fprintf('============================================================\n');

% Corresponding to:
% Grade0, Grade1, Grade2, Grade3, Grade4

classWeights = [ ...
    1.00, ...
    2.00, ...
    1.25, ...
    2.50, ...
    2.25];

fprintf('\nClass weights:\n');

for k = 1:5

    fprintf('  Grade%d -> %.2f\n', ...
        k-1, ...
        classWeights(k));

end


%% ============================================================
% 20. CREATE WEIGHTED CROSS-ENTROPY LOSS
% =============================================================

fprintf('\nCreating weighted cross-entropy loss...\n');

% Convert weights to a dlarray with class dimension.
% ResNet-50 outputs scores in the form:
%       Classes x Batch
%
% Therefore the class weights must be formatted along
% the channel/class dimension.

classWeightsDL = dlarray( ...
    single(classWeights(:)), ...
    'C');

lossFcn = @(Y,T) crossentropy( ...
    Y, ...
    T, ...
    Weights=classWeightsDL, ...
    WeightsFormat='C');

lossFcn = dlaccelerate(lossFcn);

fprintf('Weighted cross-entropy loss created successfully.\n');
%% ============================================================
% 21. DATA AUGMENTATION
% =============================================================

fprintf('\n');
fprintf('============================================================\n');
fprintf('DATA AUGMENTATION\n');
fprintf('============================================================\n');

imageAugmenter = imageDataAugmenter( ...
    'RandRotation',[-8 8], ...
    'RandXTranslation',[-8 8], ...
    'RandYTranslation',[-8 8], ...
    'RandScale',[0.95 1.05]);

augimdsTrain = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsTrain, ...
    'DataAugmentation',imageAugmenter);

augimdsValidation = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsValidation);

augimdsTest = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsTest);

fprintf('Training datastore ready.\n');
fprintf('Validation datastore ready.\n');
fprintf('Test datastore ready.\n');


%% ============================================================
% 22. TRAINING CONFIGURATION
% =============================================================

miniBatchSize = 16;
maxEpochs = 10;

initialLearnRate = 1e-5;

iterationsPerEpoch = ceil( ...
    numel(trainFiles) / miniBatchSize);

validationFrequency = iterationsPerEpoch;

fprintf('\n');
fprintf('============================================================\n');
fprintf('TRAINING CONFIGURATION\n');
fprintf('============================================================\n');

fprintf('Architecture          : ResNet-50\n');
fprintf('Fine-tuning           : Res5 + classification head\n');
fprintf('Input size            : %d x %d x %d\n', ...
    inputSize(1), ...
    inputSize(2), ...
    inputSize(3));

fprintf('Number of classes     : 5\n');
fprintf('Mini-batch size       : %d\n', miniBatchSize);
fprintf('Maximum epochs        : %d\n', maxEpochs);
fprintf('Initial learning rate : %.1e\n', initialLearnRate);
fprintf('Optimizer             : Adam\n');
fprintf('Execution             : GPU\n');
fprintf('Validation frequency  : %d iterations\n', ...
    validationFrequency);


%% ============================================================
% 23. TRAINING OPTIONS
% =============================================================

options = trainingOptions("adam", ...
    InitialLearnRate=initialLearnRate, ...
    MaxEpochs=maxEpochs, ...
    MiniBatchSize=miniBatchSize, ...
    Shuffle="every-epoch", ...
    ValidationData=augimdsValidation, ...
    ValidationFrequency=validationFrequency, ...
    ValidationPatience=3, ...
    ExecutionEnvironment="gpu", ...
    Metrics="accuracy", ...
    Plots="training-progress", ...
    Verbose=true);


%% ============================================================
% 24. START TRAINING
% =============================================================

fprintf('\n');
fprintf('============================================================\n');
fprintf(' STARTING FINE-TUNED + CLASS-WEIGHTED RESNET-50 TRAINING\n');
fprintf('============================================================\n');

trainingStart = tic;

netTrained = trainnet( ...
    augimdsTrain, ...
    net, ...
    lossFcn, ...
    options);

trainingTime = toc(trainingStart);

fprintf('\nTraining completed.\n');
fprintf('Training time: %.2f minutes\n', ...
    trainingTime/60);


%% ============================================================
% 25. TEST PREDICTIONS
% =============================================================

fprintf('\n');
fprintf('============================================================\n');
fprintf('TEST EVALUATION\n');
fprintf('============================================================\n');

testStart = tic;

scores = minibatchpredict( ...
    netTrained, ...
    augimdsTest, ...
    ExecutionEnvironment="gpu");

testInferenceTime = toc(testStart);

fprintf('Test inference time: %.2f seconds\n', ...
    testInferenceTime);

fprintf('Average inference/image: %.4f seconds\n', ...
    testInferenceTime / numel(testFiles));


%% ============================================================
% 26. CONVERT SCORES TO LABELS
% =============================================================

predictedLabels = scores2label( ...
    scores, ...
    categories(testLabels));


%% ============================================================
% 27. CONFUSION MATRIX
% =============================================================

fprintf('\nCreating confusion matrix...\n');

figure('Name', ...
    'Fine-Tuned ResNet-50 - APTOS Test Confusion Matrix', ...
    'Color','w');

confusionchart( ...
    testLabels, ...
    predictedLabels);

title('Fine-Tuned + Class-Weighted ResNet-50 - APTOS Test Confusion Matrix');

drawnow;


%% ============================================================
% 28. CALCULATE METRICS
% =============================================================

C = confusionmat( ...
    testLabels, ...
    predictedLabels, ...
    'Order',categorical( ...
        {'Grade0','Grade1','Grade2','Grade3','Grade4'}));

numClasses = 5;

recall = zeros(numClasses,1);
precision = zeros(numClasses,1);
f1 = zeros(numClasses,1);

for k = 1:numClasses

    TP = C(k,k);

    FN = sum(C(k,:)) - TP;
    FP = sum(C(:,k)) - TP;

    if TP + FN > 0
        recall(k) = TP / (TP + FN);
    end

    if TP + FP > 0
        precision(k) = TP / (TP + FP);
    end

    if precision(k) + recall(k) > 0

        f1(k) = 2 * ...
            precision(k) * recall(k) / ...
            (precision(k) + recall(k));

    end

end


%% ============================================================
% 29. OVERALL METRICS
% =============================================================

testAccuracy = sum(diag(C)) / sum(C(:));

testBalancedAccuracy = mean(recall);

testMacroF1 = mean(f1);


%% ============================================================
% 30. PRINT CLASS METRICS
% =============================================================

fprintf('\n');
fprintf('============================================================\n');
fprintf('PER-CLASS TEST PERFORMANCE\n');
fprintf('============================================================\n');

fprintf('\n');

for k = 1:numClasses

    fprintf('%-8s | Precision: %6.2f %% | Recall: %6.2f %% | F1: %.4f\n', ...
        sprintf('Grade%d',k-1), ...
        precision(k)*100, ...
        recall(k)*100, ...
        f1(k));

end


%% ============================================================
% 31. SAVE MODEL
% =============================================================

modelPath = fullfile( ...
    resultsFolder, ...
    'ResNet50_Finetuned_ClassWeighted_Model.mat');

classWeightPath = fullfile( ...
    resultsFolder, ...
    'ResNet50_Finetuned_ClassWeights.mat');

save( ...
    modelPath, ...
    'netTrained', ...
    'inputSize', ...
    'classNamesDR', ...
    'classWeights', ...
    '-v7.3');

save( ...
    classWeightPath, ...
    'classWeights', ...
    'recall', ...
    'precision', ...
    'f1', ...
    'C');

fprintf('\nModel saved:\n%s\n', modelPath);


%% ============================================================
% 32. FINAL SUMMARY
% =============================================================

fprintf('\n');
fprintf('============================================================\n');
fprintf('                 FINAL SUMMARY\n');
fprintf('============================================================\n');

fprintf('Architecture       : ResNet-50\n');
fprintf('Training strategy  : Fine-tuned Res5 + weighted loss\n');
fprintf('Input              : 224 x 224 x 3\n');
fprintf('Classes            : 5\n');

fprintf('\nDataset:\n');
fprintf('Training           : %d\n', numel(trainFiles));
fprintf('Validation         : %d\n', numel(valFiles));
fprintf('Test               : %d\n', numel(testFiles));

fprintf('\nClass weights:\n');

for k = 1:5

    fprintf('Grade%d              : %.2f\n', ...
        k-1, ...
        classWeights(k));

end

fprintf('\nPerformance:\n');

fprintf('Test Accuracy             : %.2f %%\n', ...
    testAccuracy*100);

fprintf('Test Balanced Accuracy    : %.2f %%\n', ...
    testBalancedAccuracy*100);

fprintf('Test Macro F1             : %.4f\n', ...
    testMacroF1);

fprintf('\nImportant minority-class recall:\n');

fprintf('Grade 3 Recall            : %.2f %%\n', ...
    recall(4)*100);

fprintf('Grade 4 Recall            : %.2f %%\n', ...
    recall(5)*100);

fprintf('\nRuntime:\n');

fprintf('Training time             : %.2f minutes\n', ...
    trainingTime/60);

fprintf('Test inference time       : %.2f seconds\n', ...
    testInferenceTime);

fprintf('Average inference/image   : %.4f seconds\n', ...
    testInferenceTime/numel(testFiles));

fprintf('\n');
fprintf('============================================================\n');
fprintf(' FINE-TUNED RESNET-50 EXPERIMENT COMPLETED\n');
fprintf('============================================================\n');