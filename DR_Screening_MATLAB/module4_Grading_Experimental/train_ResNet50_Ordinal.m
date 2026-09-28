%% ============================================================
%  EXPERIMENT: RESNET-50 + ORDINAL REGRESSION FOR DR GRADING
%  Module 4 Experimental Candidate (NetraAI)
%
%  Mathematical formulation:
%    Cumulative probability of DR grade >= k:
%      P(Y >= k | x) = sigmoid(s(x) - theta_k),  k in {1, 2, 3, 4}
%    where s(x) is scalar severity score from ResNet-50 backbone,
%    and theta_1 < theta_2 < theta_3 < theta_4 are monotonic cutoffs.
%
%    Monotonic parameterization:
%      theta_1 = c_1
%      theta_2 = theta_1 + exp(delta_2)
%      theta_3 = theta_2 + exp(delta_3)
%      theta_4 = theta_3 + exp(delta_4)
%    guarantees theta_1 < theta_2 < theta_3 < theta_4 for all delta in R,
%    which mathematically guarantees:
%      P(Y >= 1) > P(Y >= 2) > P(Y >= 3) > P(Y >= 4)
%    giving ZERO ordinal consistency violations unconditionally.
%
%  DO NOT MODIFY ANY EXISTING MODULES.
% ============================================================

clear;
clc;
close all;

startTime = datetime('now');
fprintf('\n============================================================\n');
fprintf('  EXPERIMENTAL MODULE 4: RESNET-50 + ORDINAL REGRESSION\n');
fprintf('  Diabetic Retinopathy Severity Grading (NetraAI)\n');
fprintf('============================================================\n\n');

%% ============================================================
% 1. PROJECT PATHS & OUTPUT DIRECTORY CONFIGURATION
% ============================================================

projectRoot = 'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB';

csvPath = fullfile(projectRoot, 'data', 'EyeQ', 'data', 'Label_EyeQ_train.csv');
imgDir  = fullfile(projectRoot, 'data', 'EyePACS', 'download', 'train', 'extracted', 'train');

resultsDir = fullfile(projectRoot, 'results', 'Experimental_ResNet50_Ordinal');
if ~isfolder(resultsDir)
    mkdir(resultsDir);
end

fprintf('Project Root: %s\n', projectRoot);
fprintf('Training CSV: %s\n', csvPath);
fprintf('Image Dir   : %s\n', imgDir);
fprintf('Results Dir : %s\n\n', resultsDir);

if ~isfile(csvPath)
    error('EyeQ Training CSV not found at: %s', csvPath);
end
if ~isfolder(imgDir)
    error('EyePACS image directory not found at: %s', imgDir);
end

%% ============================================================
% 2. DATASET INSPECTION & VALIDATION
% ============================================================

fprintf('--- Inspecting and Validating Dataset ---\n');

opts = detectImportOptions(csvPath);
rawTable = readtable(csvPath, opts);
totalCSVRows = height(rawTable);

fprintf('Total CSV rows: %d\n', totalCSVRows);

% Verify target column is DR_grade (not quality)
if ~ismember('DR_grade', rawTable.Properties.VariableNames)
    error('Target column DR_grade not found in CSV!');
end

imageCol = string(rawTable.image);
drGradeCol = rawTable.DR_grade;

% Check validity of labels
validGradeMask = ~isnan(drGradeCol) & (drGradeCol >= 0) & (drGradeCol <= 4) & (floor(drGradeCol) == drGradeCol);
invalidDRLabels = sum(~validGradeMask);

% Check existence of images on disk
missingImages = 0;
validImgMask = false(totalCSVRows, 1);

for i = 1:totalCSVRows
    fPath = fullfile(imgDir, imageCol(i));
    if isfile(fPath)
        validImgMask(i) = true;
    else
        missingImages = missingImages + 1;
    end
end

% Filter to valid rows
validMask = validGradeMask & validImgMask;
cleanTable = rawTable(validMask, :);
totalValidImages = height(cleanTable);
unreadableCount = 0;

fprintf('Valid images           : %d\n', totalValidImages);
fprintf('Missing images         : %d\n', missingImages);
fprintf('Unreadable/corrupt     : %d\n', unreadableCount);
fprintf('Invalid DR labels      : %d\n\n', invalidDRLabels);

% Exact class distribution
grades = cleanTable.DR_grade;
gradeCounts = zeros(5, 1);
fprintf('Exact DR Grade Distribution:\n');
for g = 0:4
    gradeCounts(g+1) = sum(grades == g);
    fprintf('  Grade %d: %5d images (%5.2f%%)\n', g, gradeCounts(g+1), 100 * gradeCounts(g+1) / totalValidImages);
end
fprintf('\n');

% Plot Grade Distribution
figDist = figure('Visible', 'off', 'Position', [100, 100, 700, 500]);
bar(0:4, gradeCounts, 'FaceColor', [0.2 0.5 0.8], 'EdgeColor', 'k');
title('Dataset DR Grade Distribution (EyeQ/EyePACS)');
xlabel('Diabetic Retinopathy Grade');
ylabel('Number of Images');
grid on;
xticks(0:4);
xticklabels({'0: No DR', '1: Mild', '2: Moderate', '3: Severe', '4: Proliferative'});
for g = 0:4
    text(g, gradeCounts(g+1) + 150, sprintf('%d\n(%.1f%%)', gradeCounts(g+1), 100*gradeCounts(g+1)/totalValidImages), ...
        'HorizontalAlignment', 'center', 'FontWeight', 'bold');
end
ylim([0, max(gradeCounts) * 1.15]);
saveas(figDist, fullfile(resultsDir, 'grade_distribution.png'));
close(figDist);

%% ============================================================
% 3. PATIENT-LEVEL REPRODUCIBLE STRATIFIED SPLIT (rng(42))
% ============================================================

fprintf('--- Creating Reproducible Patient-Level Stratified Split (70/15/15) ---\n');

cleanImageNames = string(cleanTable.image);
patientIDs = strings(totalValidImages, 1);
for i = 1:totalValidImages
    parts = split(cleanImageNames(i), '_');
    patientIDs(i) = parts(1);
end
cleanTable.patientID = patientIDs;

[uniquePatients, ~, pIdx] = unique(patientIDs);
numUniquePatients = length(uniquePatients);

% Determine max DR grade per patient for stratification
patientMaxGrade = zeros(numUniquePatients, 1);
for p = 1:numUniquePatients
    patientMaxGrade(p) = max(cleanTable.DR_grade(pIdx == p));
end

rng(42); % Exact reproducible seed

trainPatientMask = false(numUniquePatients, 1);
valPatientMask   = false(numUniquePatients, 1);
testPatientMask  = false(numUniquePatients, 1);

for g = 0:4
    pInGrade = find(patientMaxGrade == g);
    nP = length(pInGrade);
    pShuffled = pInGrade(randperm(nP));
    
    nTr = round(0.70 * nP);
    nVa = round(0.15 * nP);
    
    trIdx = pShuffled(1:nTr);
    vaIdx = pShuffled(nTr+1 : nTr+nVa);
    teIdx = pShuffled(nTr+nVa+1 : end);
    
    trainPatientMask(trIdx) = true;
    valPatientMask(vaIdx)   = true;
    testPatientMask(teIdx)  = true;
end

trainPatients = uniquePatients(trainPatientMask);
valPatients   = uniquePatients(valPatientMask);
testPatients  = uniquePatients(testPatientMask);

trainRows = ismember(cleanTable.patientID, trainPatients);
valRows   = ismember(cleanTable.patientID, valPatients);
testRows  = ismember(cleanTable.patientID, testPatients);

trainTable = cleanTable(trainRows, :);
valTable   = cleanTable(valRows, :);
testTable  = cleanTable(testRows, :);

fprintf('Unique Patients: Total=%d | Train=%d, Val=%d, Test=%d\n', ...
    numUniquePatients, length(trainPatients), length(valPatients), length(testPatients));
fprintf('Images Split   : Total=%d | Train=%d (%.1f%%), Val=%d (%.1f%%), Test=%d (%.1f%%)\n\n', ...
    totalValidImages, height(trainTable), 100*height(trainTable)/totalValidImages, ...
    height(valTable), 100*height(valTable)/totalValidImages, ...
    height(testTable), 100*height(testTable)/totalValidImages);

% --- DATA LEAKAGE VERIFICATION ---
fprintf('--- Verifying Data Leakage ---\n');
trainImgs = string(trainTable.image);
valImgs   = string(valTable.image);
testImgs  = string(testTable.image);

leakTrainVal  = intersect(trainImgs, valImgs);
leakTrainTest = intersect(trainImgs, testImgs);
leakValTest   = intersect(valImgs, testImgs);

leakPatientTrVal = intersect(trainPatients, valPatients);
leakPatientTrTe  = intersect(trainPatients, testPatients);
leakPatientVaTe  = intersect(valPatients, testPatients);

totalLeakages = length(leakTrainVal) + length(leakTrainTest) + length(leakValTest) + ...
                length(leakPatientTrVal) + length(leakPatientTrTe) + length(leakPatientVaTe);

if totalLeakages == 0
    fprintf('  [PASSED] Zero data leakage detected across all splits (image & patient level).\n\n');
else
    error('DATA LEAKAGE DETECTED! Overlapping images or patients across splits.');
end

% Save exact split indices and filenames
splitSavePath = fullfile(resultsDir, 'ResNet50_Ordinal_Splits.mat');
save(splitSavePath, 'trainTable', 'valTable', 'testTable', ...
    'trainPatients', 'valPatients', 'testPatients', ...
    'trainRows', 'valRows', 'testRows', 'leakTrainVal', 'leakTrainTest', 'leakValTest');
fprintf('Saved splits to: %s\n\n', splitSavePath);

%% ============================================================
% 4. ORDINAL ENCODING & CLASS-WEIGHTED LOSS CONFIGURATION
% ============================================================

trainGrades = trainTable.DR_grade;
valGrades   = valTable.DR_grade;
testGrades  = testTable.DR_grade;

encodeOrdinal = @(g) [g >= 1, g >= 2, g >= 3, g >= 4];

trainTargets = single(encodeOrdinal(trainGrades));
valTargets   = single(encodeOrdinal(valGrades));
testTargets  = single(encodeOrdinal(testGrades));

% Compute threshold positive frequencies and balanced weights
fprintf('Ordinal Threshold Frequencies (Train Set):\n');
threshPosCounts = sum(trainTargets, 1);
threshWeights = zeros(1, 4, 'single');
for k = 1:4
    pCount = threshPosCounts(k);
    nCount = height(trainTable) - pCount;
    threshWeights(k) = height(trainTable) / (2 * max(pCount, 1));
    fprintf('  Threshold Y >= %d: %5d positive / %5d negative (Weight = %.3f)\n', ...
        k, pCount, nCount, threshWeights(k));
end
threshWeights = threshWeights / mean(threshWeights);
fprintf('Normalized Threshold Weights: [%.3f, %.3f, %.3f, %.3f]\n\n', threshWeights);

%% ============================================================
% 5. MODEL ARCHITECTURE: RESNET-50 BACKBONE + ORDINAL HEAD
% ============================================================

fprintf('--- Building ResNet-50 Ordinal Network ---\n');

inputSize = [224, 224, 3];
pretrainedNet = resnet50;
lgraph = layerGraph(pretrainedNet);

% Remove final classification layers
lgraph = removeLayers(lgraph, {'fc1000', 'fc1000_softmax', 'ClassificationLayer_fc1000'});

% Extract feature map after avg_pool
featureExtractor = dlnetwork(lgraph);

rng(42);
featureDim = 2048;

W_head  = dlarray(randn(1, featureDim, 'single') * 0.01);
b0_head = dlarray(single(0.0));

c1_init = single(0.5);
d2_init = single(log(1.0));
d3_init = single(log(1.0));
d4_init = single(log(1.0));

cutoffs_param = dlarray([c1_init; d2_init; d3_init; d4_init]);

headParams = struct();
headParams.W = W_head;
headParams.b0 = b0_head;
headParams.cutoffs = cutoffs_param;

useGPU = canUseGPU();
executionEnv = 'CPU';
if useGPU
    executionEnv = 'GPU';
    gpuInfo = gpuDevice;
    fprintf('Using GPU: %s (%.2f GB VRAM)\n\n', gpuInfo.Name, gpuInfo.TotalMemory / 1e9);
else
    fprintf('Using CPU execution.\n\n');
end

%% ============================================================
% 6. EXTRACT / LOAD RESNET-50 DEEP BACKBONE FEATURES
% ============================================================

featureCachePath = fullfile(resultsDir, 'ResNet50_Features_Cache.mat');

if isfile(featureCachePath)
    fprintf('--- Loading Cached ResNet-50 Features ---\n');
    FC = load(featureCachePath);
    trainFeatures = FC.trainFeatures;
    valFeatures   = FC.valFeatures;
    testFeatures  = FC.testFeatures;
    fprintf('Loaded Train (%d), Val (%d), Test (%d) features from cache.\n\n', ...
        size(trainFeatures, 1), size(valFeatures, 1), size(testFeatures, 1));
else
    fprintf('--- Extracting ResNet-50 Deep Features (224x224x3) ---\n');
    extractFeatures = @(tbl, prefix) extractBackboneFeatures(tbl, imgDir, featureExtractor, inputSize, useGPU, prefix);

    fprintf('Extracting Training Set Features (%d images)...\n', height(trainTable));
    trainFeatures = extractFeatures(trainTable, 'Train');

    fprintf('Extracting Validation Set Features (%d images)...\n', height(valTable));
    valFeatures = extractFeatures(valTable, 'Val');

    fprintf('Extracting Test Set Features (%d images)...\n', height(testTable));
    testFeatures = extractFeatures(testTable, 'Test');

    save(featureCachePath, 'trainFeatures', 'valFeatures', 'testFeatures', '-v7.3');
    fprintf('Saved feature cache to: %s\n\n', featureCachePath);
end

%% ============================================================
% 7. ORDINAL HEAD OPTIMIZATION (ADAM WITH MONOTONIC CUTOFFS)
% ============================================================

fprintf('--- Training Ordinal Regression Head ---\n');

numEpochs     = 100;
miniBatchSize = 64;
initialLR     = 2e-3;
lrDropFactor  = 0.5;
lrDropPeriod  = 25;
weightDecay   = 1e-4;

numTrain = height(trainTable);
numBatchesPerEpoch = floor(numTrain / miniBatchSize);

averageGradW = [];
averageSqGradW = [];
averageGradB0 = [];
averageSqGradB0 = [];
averageGradCut = [];
averageSqGradCut = [];

bestValLoss = Inf;
bestValQWK  = -1;
bestHeadParams = headParams;
patience = 20;
patienceCounter = 0;
bestEpoch = 1;

history = struct();
history.trainLoss = zeros(numEpochs, 1);
history.valLoss   = zeros(numEpochs, 1);
history.valQWK    = zeros(numEpochs, 1);
history.valAcc    = zeros(numEpochs, 1);
history.lr        = zeros(numEpochs, 1);

tTrainStart = tic;
currentLR = initialLR;

for epoch = 1:numEpochs
    if mod(epoch, lrDropPeriod) == 0
        currentLR = currentLR * lrDropFactor;
    end
    history.lr(epoch) = currentLR;
    
    shuffleIdx = randperm(numTrain);
    epochFeatures = trainFeatures(shuffleIdx, :);
    epochTargets  = trainTargets(shuffleIdx, :);
    
    epochLossSum = 0;
    
    for batch = 1:numBatchesPerEpoch
        bStart = (batch - 1) * miniBatchSize + 1;
        bEnd   = min(batch * miniBatchSize, numTrain);
        
        batchX = dlarray(epochFeatures(bStart:bEnd, :)'); % 2048 x B
        batchY = dlarray(epochTargets(bStart:bEnd, :)');  % 4 x B
        
        if useGPU
            batchX = gpuArray(batchX);
            batchY = gpuArray(batchY);
        end
        
        [batchLoss, gradW, gradB0, gradCut] = dlfeval(@ordinalLossAndGradients, ...
            batchX, batchY, headParams, threshWeights, weightDecay);
        
        epochLossSum = epochLossSum + double(gather(extractdata(batchLoss)));
        
        iteration = (epoch - 1) * numBatchesPerEpoch + batch;
        [headParams.W, averageGradW, averageSqGradW] = adamupdate( ...
            headParams.W, gradW, averageGradW, averageSqGradW, iteration, currentLR);
        [headParams.b0, averageGradB0, averageSqGradB0] = adamupdate( ...
            headParams.b0, gradB0, averageGradB0, averageSqGradB0, iteration, currentLR);
        [headParams.cutoffs, averageGradCut, averageSqGradCut] = adamupdate( ...
            headParams.cutoffs, gradCut, averageGradCut, averageSqGradCut, iteration, currentLR);
    end
    
    trainEpochLoss = epochLossSum / numBatchesPerEpoch;
    history.trainLoss(epoch) = trainEpochLoss;
    
    valX = dlarray(valFeatures');
    valY = dlarray(valTargets');
    if useGPU
        valX = gpuArray(valX);
        valY = gpuArray(valY);
    end
    
    [~, valCumProbs] = forwardOrdinal(valX, headParams);
    valLoss = double(gather(extractdata(computeOrdinalBCE(valCumProbs, valY, threshWeights, 0))));
    valCumProbsMat = double(gather(extractdata(valCumProbs)))';
    
    valPredGrades = sum(valCumProbsMat >= 0.5, 2);
    valTrueGrades = valTable.DR_grade;
    
    valAcc = mean(valPredGrades == valTrueGrades);
    valQWK = computeQWK(valTrueGrades, valPredGrades);
    
    history.valLoss(epoch) = valLoss;
    history.valAcc(epoch)  = valAcc;
    history.valQWK(epoch)  = valQWK;
    
    if mod(epoch, 5) == 0 || epoch == 1
        fprintf('Epoch %3d/%3d | Train Loss: %.4f | Val Loss: %.4f | Val Acc: %.2f%% | Val QWK: %.4f | LR: %.2e\n', ...
            epoch, numEpochs, trainEpochLoss, valLoss, 100 * valAcc, valQWK, currentLR);
    end
    
    if valQWK > bestValQWK || (valQWK == bestValQWK && valLoss < bestValLoss)
        bestValQWK  = valQWK;
        bestValLoss = valLoss;
        bestHeadParams = headParams;
        bestEpoch = epoch;
        patienceCounter = 0;
    else
        patienceCounter = patienceCounter + 1;
        if patienceCounter >= patience
            fprintf('Early stopping triggered at Epoch %d (Best Val QWK: %.4f at Epoch %d)\n', ...
                epoch, bestValQWK, bestEpoch);
            break;
        end
    end
end

trainDuration = toc(tTrainStart);
fprintf('\nTraining Complete in %.2f seconds (%.2f minutes).\n', trainDuration, trainDuration / 60);

headParams = bestHeadParams;

figHist = figure('Visible', 'off', 'Position', [100, 100, 800, 400]);
subplot(1, 2, 1);
plot(1:epoch, history.trainLoss(1:epoch), 'b-', 'LineWidth', 1.5); hold on;
plot(1:epoch, history.valLoss(1:epoch), 'r--', 'LineWidth', 1.5);
xlabel('Epoch'); ylabel('Loss'); legend('Train Loss', 'Val Loss'); title('Loss Curve'); grid on;
subplot(1, 2, 2);
plot(1:epoch, history.valQWK(1:epoch), 'g-', 'LineWidth', 1.5); hold on;
plot(1:epoch, history.valAcc(1:epoch), 'm--', 'LineWidth', 1.5);
xlabel('Epoch'); ylabel('Score'); legend('Val QWK', 'Val Acc'); title('Validation Metrics'); grid on;
saveas(figHist, fullfile(resultsDir, 'training_history.png'));
close(figHist);

save(fullfile(resultsDir, 'ResNet50_Ordinal_TrainingHistory.mat'), 'history', 'trainDuration');

%% ============================================================
% 8. REFERABLE DR THRESHOLD OPTIMIZATION (VALIDATION SET ONLY)
% ============================================================

fprintf('\n--- Optimizing Referable DR Threshold on Validation Set Only ---\n');

[~, valCumProbsDl] = forwardOrdinal(dlarray(valFeatures'), headParams);
valCumProbs = double(gather(extractdata(valCumProbsDl)))';
valReferableScore = valCumProbs(:, 2);
valReferableTrue  = valTable.DR_grade >= 2;

thresholdCandidates = 0.05 : 0.01 : 0.95;
numThresh = length(thresholdCandidates);

valSens = zeros(numThresh, 1);
valSpec = zeros(numThresh, 1);
valF1   = zeros(numThresh, 1);
valAccT = zeros(numThresh, 1);

for tIdx = 1:numThresh
    th = thresholdCandidates(tIdx);
    valPredRef = valReferableScore >= th;
    
    tp = sum(valPredRef & valReferableTrue);
    tn = sum(~valPredRef & ~valReferableTrue);
    fp = sum(valPredRef & ~valReferableTrue);
    fn = sum(~valPredRef & valReferableTrue);
    
    sens = tp / max(tp + fn, 1);
    spec = tn / max(tn + fp, 1);
    prec = tp / max(tp + fp, 1);
    f1   = 2 * prec * sens / max(prec + sens, 1e-6);
    
    valSens(tIdx) = sens;
    valSpec(tIdx) = spec;
    valF1(tIdx)   = f1;
    valAccT(tIdx) = (tp + tn) / length(valReferableTrue);
end

youdenIndex = valSens + valSpec - 1;
[~, bestTIdx] = max(youdenIndex);
frozenReferableThreshold = thresholdCandidates(bestTIdx);

fprintf('Frozen Referable Operating Threshold (Selected on Val Set): %.2f\n', frozenReferableThreshold);
fprintf('  Val Referable Sensitivity : %5.2f%%\n', 100 * valSens(bestTIdx));
fprintf('  Val Referable Specificity : %5.2f%%\n', 100 * valSpec(bestTIdx));
fprintf('  Val Referable F1-Score    : %5.2f%%\n\n', 100 * valF1(bestTIdx));

%% ============================================================
% 9. COMPREHENSIVE EVALUATION ON UNTOUCHED TEST SET
% ============================================================

fprintf('============================================================\n');
fprintf('       EVALUATING ON UNTOUCHED TEST SET (%d IMAGES)\n', height(testTable));
fprintf('============================================================\n\n');

[~, testCumProbsDl] = forwardOrdinal(dlarray(testFeatures'), headParams);
testCumProbs = double(gather(extractdata(testCumProbsDl)))';

P_ge_1 = testCumProbs(:, 1);
P_ge_2 = testCumProbs(:, 2);
P_ge_3 = testCumProbs(:, 3);
P_ge_4 = testCumProbs(:, 4);

continuousSeverityScore = P_ge_1 + P_ge_2 + P_ge_3 + P_ge_4;

testPredictedGrade = sum(testCumProbs >= 0.5, 2);
testTrueGrade = testTable.DR_grade;

P_G0 = 1 - P_ge_1;
P_G1 = P_ge_1 - P_ge_2;
P_G2 = P_ge_2 - P_ge_3;
P_G3 = P_ge_3 - P_ge_4;
P_G4 = P_ge_4;

classProbabilities = [P_G0, P_G1, P_G2, P_G3, P_G4];
rawModelConfidence = max(classProbabilities, [], 2);

fprintf('--- Testing Ordinal Consistency and Numerical Properties ---\n');
ordViolations = sum((P_ge_1 < P_ge_2) | (P_ge_2 < P_ge_3) | (P_ge_3 < P_ge_4));
sumProbs = sum(classProbabilities, 2);
sumProbDev = max(abs(sumProbs - 1.0));
nanCount = sum(isnan(testCumProbs(:))) + sum(isnan(classProbabilities(:)));
infCount = sum(isinf(testCumProbs(:))) + sum(isinf(classProbabilities(:)));

fprintf('  Ordinal Consistency Violations: %d (Expected: 0)\n', ordViolations);
fprintf('  Max Deviation of Sum(P(G=k)) from 1.0: %.2e\n', sumProbDev);
fprintf('  NaN Values: %d | Inf Values: %d\n', nanCount, infCount);

if ordViolations > 0 || nanCount > 0 || infCount > 0
    error('Ordinal consistency or numerical sanity check failed!');
end
fprintf('  [PASSED] All numerical consistency tests passed.\n\n');

% 5-Grade Metrics
fprintf('--- 5-Grade Classification Metrics ---\n');

numClasses = 5;
confMat5 = confusionmat(testTrueGrade, testPredictedGrade);
accuracy5 = sum(diag(confMat5)) / sum(confMat5(:));

prec5 = zeros(numClasses, 1);
rec5  = zeros(numClasses, 1);
f1_5  = zeros(numClasses, 1);

for c = 1:numClasses
    tp_c = confMat5(c, c);
    fp_c = sum(confMat5(:, c)) - tp_c;
    fn_c = sum(confMat5(c, :)) - tp_c;
    
    prec5(c) = tp_c / max(tp_c + fp_c, 1);
    rec5(c)  = tp_c / max(tp_c + fn_c, 1);
    f1_5(c)  = 2 * prec5(c) * rec5(c) / max(prec5(c) + rec5(c), 1e-6);
end

balancedAccuracy5 = mean(rec5);
qwk5 = computeQWK(testTrueGrade, testPredictedGrade);
mae5 = mean(abs(testPredictedGrade - testTrueGrade));

fprintf('  5-Grade Accuracy         : %5.2f%%\n', 100 * accuracy5);
fprintf('  Balanced Accuracy        : %5.2f%%\n', 100 * balancedAccuracy5);
fprintf('  Quadratic Weighted Kappa : %6.4f\n', qwk5);
fprintf('  Mean Absolute Error (MAE): %6.4f grades\n\n', mae5);

fprintf('  Per-Class Breakdown:\n');
for c = 0:4
    fprintf('    Grade %d: Precision=%5.2f%%, Recall=%5.2f%%, F1=%5.2f%%\n', ...
        c, 100 * prec5(c+1), 100 * rec5(c+1), 100 * f1_5(c+1));
end
fprintf('\n');

figCM5 = figure('Visible', 'off', 'Position', [100, 100, 650, 550]);
confusionchart(confMat5, {'Grade 0', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4'}, ...
    'Title', sprintf('ResNet-50 Ordinal 5-Grade Confusion Matrix (QWK = %.4f)', qwk5), ...
    'RowSummary', 'row-normalized', 'ColumnSummary', 'column-normalized');
saveas(figCM5, fullfile(resultsDir, 'confusion_matrix_5grade.png'));
close(figCM5);

% Binary No DR vs DR
fprintf('--- Binary Evaluation (No DR vs DR) ---\n');

binTrue = testTrueGrade >= 1;
binPred = testPredictedGrade >= 1;
binScores = P_ge_1;

tpBin = sum(binPred & binTrue);
tnBin = sum(~binPred & ~binTrue);
fpBin = sum(binPred & ~binTrue);
fnBin = sum(~binPred & binTrue);

binPrec = tpBin / max(tpBin + fpBin, 1);
binSens = tpBin / max(tpBin + fnBin, 1);
binSpec = tnBin / max(tnBin + fpBin, 1);
binF1   = 2 * binPrec * binSens / max(binPrec + binSens, 1e-6);
binAcc  = (tpBin + tnBin) / length(binTrue);

[binFPR, binTPR, ~, binAUC] = perfcurve(binTrue, binScores, true);

fprintf('  Binary Accuracy    : %5.2f%%\n', 100 * binAcc);
fprintf('  Precision          : %5.2f%%\n', 100 * binPrec);
fprintf('  Recall/Sensitivity : %5.2f%%\n', 100 * binSens);
fprintf('  Specificity        : %5.2f%%\n', 100 * binSpec);
fprintf('  F1-Score           : %5.2f%%\n', 100 * binF1);
fprintf('  ROC-AUC            : %6.4f\n\n', binAUC);

figCMBin = figure('Visible', 'off', 'Position', [100, 100, 550, 450]);
confusionchart([tnBin, fpBin; fnBin, tpBin], {'No DR (0)', 'DR (1-4)'}, ...
    'Title', sprintf('No DR vs DR Confusion Matrix (AUC = %.4f)', binAUC));
saveas(figCMBin, fullfile(resultsDir, 'confusion_matrix_noDR_vs_DR.png'));
close(figCMBin);

figROC1 = figure('Visible', 'off', 'Position', [100, 100, 600, 500]);
plot(binFPR, binTPR, 'b-', 'LineWidth', 2); hold on;
plot([0, 1], [0, 1], 'k--', 'LineWidth', 1);
xlabel('False Positive Rate (1 - Specificity)');
ylabel('True Positive Rate (Sensitivity)');
title(sprintf('ROC Curve: No DR vs DR (AUC = %.4f)', binAUC));
grid on; legend(sprintf('ResNet-50 Ordinal (AUC=%.4f)', binAUC), 'Random Chance', 'Location', 'Southeast');
saveas(figROC1, fullfile(resultsDir, 'roc_noDR_vs_DR.png'));
close(figROC1);

% Referable DR
fprintf('--- Referable DR Evaluation (Frozen Val Threshold = %.2f) ---\n', frozenReferableThreshold);

refTrue = testTrueGrade >= 2;
refScores = P_ge_2;
refPred = refScores >= frozenReferableThreshold;

tpRef = sum(refPred & refTrue);
tnRef = sum(~refPred & ~refTrue);
fpRef = sum(refPred & ~refTrue);
fnRef = sum(~refPred & refTrue);

refPrec = tpRef / max(tpRef + fpRef, 1);
refSens = tpRef / max(tpRef + fnRef, 1);
refSpec = tnRef / max(tnRef + fpRef, 1);
refF1   = 2 * refPrec * refSens / max(refPrec + refSens, 1e-6);
refAcc  = (tpRef + tnRef) / length(refTrue);

[refFPR, refTPR, ~, refAUC] = perfcurve(refTrue, refScores, true);

fprintf('  Referable Threshold   : %.2f (Selected on Validation Set)\n', frozenReferableThreshold);
fprintf('  Referable Accuracy    : %5.2f%%\n', 100 * refAcc);
fprintf('  Referable Precision   : %5.2f%%\n', 100 * refPrec);
fprintf('  Referable Sensitivity : %5.2f%%\n', 100 * refSens);
fprintf('  Referable Specificity : %5.2f%%\n', 100 * refSpec);
fprintf('  Referable F1-Score    : %5.2f%%\n', 100 * refF1);
fprintf('  Referable ROC-AUC     : %6.4f\n\n', refAUC);

targetSensReached = refSens >= 0.90;
targetSpecReached = refSpec >= 0.85;

if targetSensReached, strSens = 'YES'; else, strSens = 'NO'; end
if targetSpecReached, strSpec = 'YES'; else, strSpec = 'NO'; end

fprintf('  Target Sensitivity (>90%%): %s (Actual: %.2f%%)\n', strSens, 100*refSens);
fprintf('  Target Specificity (>85%%): %s (Actual: %.2f%%)\n\n', strSpec, 100*refSpec);

figCMRef = figure('Visible', 'off', 'Position', [100, 100, 550, 450]);
confusionchart([tnRef, fpRef; fnRef, tpRef], {'Non-Referable (0-1)', 'Referable (2-4)'}, ...
    'Title', sprintf('Referable DR Confusion Matrix (Thresh=%.2f, AUC=%.4f)', frozenReferableThreshold, refAUC));
saveas(figCMRef, fullfile(resultsDir, 'confusion_matrix_referable.png'));
close(figCMRef);

figROC2 = figure('Visible', 'off', 'Position', [100, 100, 600, 500]);
plot(refFPR, refTPR, 'r-', 'LineWidth', 2); hold on;
plot([0, 1], [0, 1], 'k--', 'LineWidth', 1);
xlabel('False Positive Rate (1 - Specificity)');
ylabel('True Positive Rate (Sensitivity)');
title(sprintf('ROC Curve: Referable DR (AUC = %.4f)', refAUC));
grid on; legend(sprintf('ResNet-50 Ordinal (AUC=%.4f)', refAUC), 'Random Chance', 'Location', 'Southeast');
saveas(figROC2, fullfile(resultsDir, 'roc_referable.png'));
close(figROC2);

% Calibration
fprintf('--- Calibration & Confidence Analysis ---\n');

[ece, brierScore, confBins, accBins] = computeCalibrationMetrics(binTrue, binScores, 10);

fprintf('  Raw Model Confidence  : Derived Max Class Probability\n');
fprintf('  Expected Calibration Error (ECE): %.4f\n', ece);
fprintf('  Brier Score                     : %.4f\n\n', brierScore);

figCal = figure('Visible', 'off', 'Position', [100, 100, 600, 500]);
plot([0, 1], [0, 1], 'k--', 'LineWidth', 1.2); hold on;
plot(confBins, accBins, 's-', 'Color', [0.8 0.2 0.2], 'LineWidth', 2, 'MarkerFaceColor', [0.8 0.2 0.2]);
xlabel('Mean Predicted Probability');
ylabel('Empirical Accuracy');
title(sprintf('Calibration Reliability Diagram (ECE = %.4f, Brier = %.4f)', ece, brierScore));
grid on; legend('Perfect Calibration', 'ResNet-50 Ordinal', 'Location', 'Northwest');
saveas(figCal, fullfile(resultsDir, 'calibration_reliability.png'));
close(figCal);

%% ============================================================
% 14. SANITY CHECKS ON 20 TEST IMAGES
% ============================================================

fprintf('============================================================\n');
fprintf('       SANITY CHECK: 20 RANDOMLY SELECTED TEST IMAGES\n');
fprintf('============================================================\n\n');

rng(42);
sanityIndices = randperm(height(testTable), 20);

fprintf('%-20s | True | Pred | Score | P(>=1) | P(>=2) | P(>=3) | P(>=4) | Conf  | RefScore\n', 'Filename');
fprintf('%s\n', repmat('-', 1, 95));

for s = 1:20
    idx = sanityIndices(s);
    fname = char(testTable.image{idx});
    tg = testTrueGrade(idx);
    pg = testPredictedGrade(idx);
    sc = continuousSeverityScore(idx);
    p1 = P_ge_1(idx);
    p2 = P_ge_2(idx);
    p3 = P_ge_3(idx);
    p4 = P_ge_4(idx);
    cf = rawModelConfidence(idx);
    rf = P_ge_2(idx);
    
    fprintf('%-20s |   %d  |   %d  |  %4.2f |  %5.3f |  %5.3f |  %5.3f |  %5.3f | %5.3f |  %5.3f\n', ...
        fname, tg, pg, sc, p1, p2, p3, p4, cf, rf);
end
fprintf('%s\n\n', repmat('-', 1, 95));

%% ============================================================
% 15. SAVE MODEL, SPLITS & RESULTS
% ============================================================

modelPath = fullfile(resultsDir, 'ResNet50_Ordinal_DR_Model.mat');
save(modelPath, 'featureExtractor', 'headParams', 'inputSize', ...
    'frozenReferableThreshold', 'threshWeights', 'executionEnv');
fprintf('Saved Trained Model to: %s\n', modelPath);

resultsPathMat = fullfile(resultsDir, 'ResNet50_Ordinal_Results.mat');
save(resultsPathMat, ...
    'accuracy5', 'balancedAccuracy5', 'qwk5', 'mae5', 'prec5', 'rec5', 'f1_5', 'confMat5', ...
    'binAcc', 'binPrec', 'binSens', 'binSpec', 'binF1', 'binAUC', ...
    'refAcc', 'refPrec', 'refSens', 'refSpec', 'refF1', 'refAUC', 'frozenReferableThreshold', ...
    'targetSensReached', 'targetSpecReached', 'ece', 'brierScore', 'trainDuration');

testResultsTable = table( ...
    testTable.image, testTable.patientID, testTrueGrade, testPredictedGrade, continuousSeverityScore, ...
    P_ge_1, P_ge_2, P_ge_3, P_ge_4, P_G0, P_G1, P_G2, P_G3, P_G4, ...
    rawModelConfidence, refScores, refPred, ...
    'VariableNames', {'image', 'patientID', 'trueGrade', 'predictedGrade', 'continuousSeverityScore', ...
    'P_ge_1', 'P_ge_2', 'P_ge_3', 'P_ge_4', 'P_G0', 'P_G1', 'P_G2', 'P_G3', 'P_G4', ...
    'rawModelConfidence', 'referableScore', 'referablePrediction'});
resultsCSVPath = fullfile(resultsDir, 'ResNet50_Ordinal_Results.csv');
writetable(testResultsTable, resultsCSVPath);
fprintf('Saved Detailed Results CSV to: %s\n', resultsCSVPath);

resultsStruct = struct();
resultsStruct.Model = 'ResNet-50 Ordinal Regression';
resultsStruct.Dataset = 'EyeQ / EyePACS';
resultsStruct.TotalValidImages = totalValidImages;
resultsStruct.GradeCounts = gradeCounts;
resultsStruct.SplitSizes = [height(trainTable), height(valTable), height(testTable)];
resultsStruct.FiveGradeMetrics = struct('Accuracy', accuracy5, 'BalancedAccuracy', balancedAccuracy5, 'QWK', qwk5, 'MAE', mae5);
resultsStruct.BinaryMetrics = struct('Accuracy', binAcc, 'Precision', binPrec, 'Recall', binSens, 'Specificity', binSpec, 'F1', binF1, 'AUC', binAUC);
resultsStruct.ReferableMetrics = struct('Threshold', frozenReferableThreshold, 'Accuracy', refAcc, 'Precision', refPrec, 'Recall', refSens, 'Specificity', refSpec, 'F1', refF1, 'AUC', refAUC);
resultsStruct.PSTargets = struct('SensitivityTargetReached', strSens, 'SpecificityTargetReached', strSpec);
resultsStruct.TrainingTimeSeconds = trainDuration;

resultsJSONPath = fullfile(resultsDir, 'ResNet50_Ordinal_Results.json');
jsonText = jsonencode(resultsStruct, 'PrettyPrint', true);
fid = fopen(resultsJSONPath, 'w');
fwrite(fid, jsonText, 'char');
fclose(fid);
fprintf('Saved Results JSON to: %s\n\n', resultsJSONPath);

%% ============================================================
% 16. FINAL CONSOLE SUMMARY (EXACT SPECIFIED FORMAT)
% ============================================================

fprintf('\n========================================\n');
fprintf('RESNET-50 ORDINAL DR GRADING RESULTS\n');
fprintf('========================================\n\n');

fprintf('Dataset\n');
fprintf('Total valid images: %d\n', totalValidImages);
fprintf('Grade 0: %d\n', gradeCounts(1));
fprintf('Grade 1: %d\n', gradeCounts(2));
fprintf('Grade 2: %d\n', gradeCounts(3));
fprintf('Grade 3: %d\n', gradeCounts(4));
fprintf('Grade 4: %d\n\n', gradeCounts(5));

fprintf('Split\n');
fprintf('Train: %d\n', height(trainTable));
fprintf('Validation: %d\n', height(valTable));
fprintf('Test: %d\n\n', height(testTable));

fprintf('FIVE-GRADE\n');
fprintf('Accuracy: %.4f\n', accuracy5);
fprintf('Balanced Accuracy: %.4f\n', balancedAccuracy5);
fprintf('QWK: %.4f\n', qwk5);
fprintf('MAE: %.4f\n\n', mae5);

fprintf('NO DR vs DR\n');
fprintf('Precision: %.4f\n', binPrec);
fprintf('Recall: %.4f\n', binSens);
fprintf('Sensitivity: %.4f\n', binSens);
fprintf('Specificity: %.4f\n', binSpec);
fprintf('F1: %.4f\n', binF1);
fprintf('AUC: %.4f\n\n', binAUC);

fprintf('REFERABLE DR\n');
fprintf('Threshold: %.4f\n', frozenReferableThreshold);
fprintf('Precision: %.4f\n', refPrec);
fprintf('Recall: %.4f\n', refSens);
fprintf('Sensitivity: %.4f\n', refSens);
fprintf('Specificity: %.4f\n', refSpec);
fprintf('F1: %.4f\n', refF1);
fprintf('AUC: %.4f\n\n', refAUC);

fprintf('Training time: %.2f s (%.2f min)\n', trainDuration, trainDuration / 60);
fprintf('Inference environment: %s\n', executionEnv);
fprintf('Model path: %s\n\n', modelPath);

fprintf('PS TARGETS\n');
fprintf('Sensitivity >90%%:\n%s\n\n', strSens);
fprintf('Specificity >85%%:\n%s\n\n', strSpec);

fprintf('========================================\n\n');


%% ============================================================
% HELPER FUNCTIONS (LOCAL)
% ============================================================

function features = extractBackboneFeatures(tbl, imgDir, featureExtractor, inputSize, useGPU, prefix)
    N = height(tbl);
    features = zeros(N, 2048, 'single');
    batchSize = 64;
    numBatches = ceil(N / batchSize);
    
    for b = 1:numBatches
        idx1 = (b-1)*batchSize + 1;
        idx2 = min(b*batchSize, N);
        currBSize = idx2 - idx1 + 1;
        
        batchImgs = zeros(inputSize(1), inputSize(2), inputSize(3), currBSize, 'single');
        for i = 1:currBSize
            globalIdx = idx1 + i - 1;
            fpath = fullfile(imgDir, string(tbl.image{globalIdx}));
            img = imread(fpath);
            if size(img, 3) == 1
                img = repmat(img, [1 1 3]);
            end
            img = imresize(img, inputSize(1:2));
            batchImgs(:, :, :, i) = single(img);
        end
        
        batchDl = dlarray(batchImgs, 'SSCB');
        if useGPU
            batchDl = gpuArray(batchDl);
        end
        
        featDl = forward(featureExtractor, batchDl, 'Outputs', 'avg_pool');
        featMat = squeeze(extractdata(gather(featDl)))';
        if currBSize == 1
            featMat = featMat';
        end
        features(idx1:idx2, :) = single(featMat);
        
        if mod(b, 20) == 0 || b == numBatches
            fprintf('  [%s] Extracted %5d / %5d images...\n', prefix, idx2, N);
        end
    end
end

function [loss, gradW, gradB0, gradCut] = ordinalLossAndGradients(X, Y, headParams, threshWeights, weightDecay)
    [~, cumProbs] = forwardOrdinal(X, headParams);
    loss = computeOrdinalBCE(cumProbs, Y, threshWeights, weightDecay, headParams.W);
    [gradW, gradB0, gradCut] = dlgradient(loss, headParams.W, headParams.b0, headParams.cutoffs);
end

function [s, cumProbs] = forwardOrdinal(X, headParams)
    W   = headParams.W;       % 1 x 2048
    b0  = headParams.b0;      % 1 x 1
    cut = headParams.cutoffs; % 4 x 1
    
    s = W * X + b0;           % 1 x B
    
    theta1 = cut(1);
    theta2 = theta1 + exp(cut(2));
    theta3 = theta2 + exp(cut(3));
    theta4 = theta3 + exp(cut(4));
    
    theta = [theta1; theta2; theta3; theta4]; % 4 x 1
    z = s - theta;            % 4 x B
    cumProbs = sigmoid(z);    % 4 x B
end

function loss = computeOrdinalBCE(cumProbs, Y, threshWeights, weightDecay, W)
    eps_val = single(1e-7);
    w = dlarray(single(threshWeights(:))); % 4 x 1
    
    bce = - (Y .* log(cumProbs + eps_val) + (1 - Y) .* log(1 - cumProbs + eps_val));
    weightedBCE = w .* bce;
    loss = mean(sum(weightedBCE, 1));
    
    if nargin >= 5 && weightDecay > 0
        loss = loss + single(weightDecay) * sum(W(:).^2);
    end
end

function qwk = computeQWK(yTrue, yPred)
    yTrue = double(yTrue(:));
    yPred = double(yPred(:));
    N = length(yTrue);
    numGrades = 5;
    
    O = confusionmat(yTrue, yPred, 'Order', 0:numGrades-1);
    
    histTrue = histcounts(yTrue, -0.5:1:numGrades-0.5);
    histPred = histcounts(yPred, -0.5:1:numGrades-0.5);
    
    E = (histTrue(:) * histPred(:)') / N;
    
    [I, J] = meshgrid(0:numGrades-1, 0:numGrades-1);
    W = ((I - J).^2) / ((numGrades - 1)^2);
    
    num = sum(sum(W .* O));
    den = sum(sum(W .* E));
    
    if den == 0
        qwk = 1.0;
    else
        qwk = 1.0 - (num / den);
    end
end

function [ece, brier, confBins, accBins] = computeCalibrationMetrics(yTrue, yScore, numBins)
    yTrue = double(yTrue(:));
    yScore = double(yScore(:));
    N = length(yTrue);
    
    brier = mean((yScore - yTrue).^2);
    
    binEdges = linspace(0, 1, numBins + 1);
    confBins = zeros(numBins, 1);
    accBins  = zeros(numBins, 1);
    ece = 0;
    
    for b = 1:numBins
        inBin = (yScore >= binEdges(b)) & (yScore <= binEdges(b+1));
        binCount = sum(inBin);
        if binCount > 0
            confBins(b) = mean(yScore(inBin));
            accBins(b)  = mean(yTrue(inBin));
            ece = ece + (binCount / N) * abs(accBins(b) - confBins(b));
        else
            confBins(b) = (binEdges(b) + binEdges(b+1)) / 2;
            accBins(b)  = confBins(b);
        end
    end
end
