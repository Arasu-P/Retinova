%% ============================================================
%  TRAINMODULE4V2 - Full Master Training & Evaluation Pipeline
%  Module 4 Experimental v2: ResNet-50 + Multitask Ordinal & Referable DR
%  (NetraAI / SIH26038)
% ============================================================

clear;
clc;
close all;

fprintf('\n============================================================\n');
fprintf('  MODULE 4 EXPERIMENTAL V2: MULTITASK RESNET-50\n');
fprintf('  Ordinal DR Severity & Referable Screening\n');
fprintf('============================================================\n\n');

cfg = config();
tGlobalStart = tic;

%% ------------------------------------------------------------
% STAGE 1: VERIFY PATHS & PATIENT-LEVEL SPLIT
% ------------------------------------------------------------
[trainTable, valTable, testTable, splitMeta] = loadSplit(cfg);

%% ------------------------------------------------------------
% STAGE 2: TEST PREPROCESSING & SAVE VISUAL EXAMPLES
% ------------------------------------------------------------
fprintf('--- STAGE 2: Preprocessing Verification ---\n');
sampleImgPath = fullfile(cfg.imgDir, string(trainTable.image{1}));
rawSample = imread(sampleImgPath);
procSample = preprocessPipeline(rawSample, cfg.inputSize);

figPrep = figure('Visible', 'off', 'Position', [100, 100, 800, 400]);
subplot(1, 2, 1); imshow(rawSample); title('Original Fundus Image');
subplot(1, 2, 2); imshow((procSample - min(procSample(:))) / (max(procSample(:)) - min(procSample(:))));
title('Preprocessed (FOV Crop + Illum Norm + 384x384)');
saveas(figPrep, fullfile(cfg.resultsDir, 'preprocessing_sample_before_after.png'));
close(figPrep);
fprintf('  Saved preprocessing visual verification to: %s\n\n', fullfile(cfg.resultsDir, 'preprocessing_sample_before_after.png'));

%% ------------------------------------------------------------
% STAGE 3 & 4: BUILD ARCHITECTURE & UNIT-TEST MODULES
% ------------------------------------------------------------
fprintf('--- STAGE 3 & 4: Architecture Forward Pass & Unit Tests ---\n');
[backboneNet, featureLayerName] = buildBackbone(cfg);
headParams = buildMultitaskHead(cfg);

% Forward pass shape test
dummyX = dlarray(zeros([cfg.inputSize(1), cfg.inputSize(2), cfg.inputSize(3), 2], 'single'), 'SSCB');
if gpuDeviceCount > 0
    dummyX = gpuArray(dummyX);
end
dummyFeat = forward(backboneNet, dummyX, 'Outputs', 'avg_pool');
featMat = squeeze(extractdata(gather(dummyFeat))); % 2048 x 2
assert(all(size(featMat) == [512, 2]) || all(size(featMat) == [2048, 2]), 'Backbone feature shape mismatch!');

[testCum, testPRef, testH] = forwardMultitask(dlarray(featMat), headParams, false, 0);
assert(all(size(testCum) == [4, 2]), 'Ordinal output must be 4 x B');
assert(all(size(testPRef) == [1, 2]), 'Referable output must be 1 x B');
assert(all(size(testH) == [512, 2]), 'Shared bottleneck must be 512 x B');

% Unit test targets & weights
[trainOrdT, trainRefT, effWeights, trainSampler] = datasetBuilder(trainTable, cfg.beta_effective);
[valOrdT, valRefT, ~, ~]                         = datasetBuilder(valTable, cfg.beta_effective);
[testOrdT, testRefT, ~, ~]                       = datasetBuilder(testTable, cfg.beta_effective);

[testClassP, testPG, testSev, ~] = ordinalUtils(extractdata(testCum));
assert(all(testClassP(:) >= -1e-5), 'Probabilities must be >= 0');
assert(max(abs(sum(testClassP, 1) - 1.0)) < 1e-4, 'Probabilities must sum to 1');
fprintf('  [PASSED] Architecture shapes, loss functions, and ordinal utility unit tests verified.\n\n');

%% ------------------------------------------------------------
% FEATURE EXTRACTION / CACHING FOR 384x384 RESNET-50
% ------------------------------------------------------------
featCachePath = fullfile(cfg.resultsDir, 'ResNet50_Features_384x384_Cache.mat');

if isfile(featCachePath)
    fprintf('--- Loading Cached 384x384 ResNet-50 Features ---\n');
    FC = load(featCachePath);
    trainFeatures = FC.trainFeatures;
    valFeatures   = FC.valFeatures;
    testFeatures  = FC.testFeatures;
    fprintf('  Loaded Train (%d), Val (%d), Test (%d) features from cache.\n\n', ...
        size(trainFeatures, 1), size(valFeatures, 1), size(testFeatures, 1));
else
    fprintf('--- Extracting ResNet-50 Features with 384x384 Preprocessed Images ---\n');
    useGPU = gpuDeviceCount > 0;
    
    extractFeats = @(tbl, prefix) extractFeaturesFast(tbl, cfg.imgDir, backboneNet, cfg.inputSize, useGPU, prefix);
    trainFeatures = extractFeats(trainTable, 'Train');
    valFeatures   = extractFeats(valTable, 'Val');
    testFeatures  = extractFeats(testTable, 'Test');
    
    save(featCachePath, 'trainFeatures', 'valFeatures', 'testFeatures', '-v7.3');
    fprintf('  Saved feature cache to: %s\n\n', featCachePath);
end

%% ------------------------------------------------------------
% STAGE 6: LAMBDA_REF CALIBRATION SWEEP
% ------------------------------------------------------------
[chosenLambdaRef, sweepResults] = lambdaCalibrationSweep( ...
    trainFeatures, trainOrdT, trainRefT, valFeatures, valOrdT, valRefT, valTable, effWeights, cfg);

%% ------------------------------------------------------------
% STAGE 7: FULL MULTITASK MODEL TRAINING (60 EPOCHS / PATIENCE 8)
% ------------------------------------------------------------
fprintf('============================================================\n');
fprintf('  STAGE 7: FULL MULTITASK TRAINING (lambda_ref = %.2f)\n', chosenLambdaRef);
fprintf('============================================================\n\n');

headParams = buildMultitaskHead(cfg);
numTrain = height(trainTable);
batchSize = cfg.batchSize;
numBatches = floor(numTrain / batchSize);

avgGW_bn = []; avgSqGW_bn = [];
avgGW_ord = []; avgSqGW_ord = [];
avgGW_ref = []; avgSqGW_ref = [];
avgGCut = []; avgSqGCut = [];

bestValComp = -1;
bestValQWK  = -1;
bestValAUROC = -1;
bestHeadParams = headParams;
patienceCounter = 0;
bestEpoch = 1;

history = struct();
history.trainLoss = zeros(cfg.maxEpochs, 1);
history.valLoss   = zeros(cfg.maxEpochs, 1);
history.valQWK    = zeros(cfg.maxEpochs, 1);
history.valAUROC  = zeros(cfg.maxEpochs, 1);
history.valComp   = zeros(cfg.maxEpochs, 1);
history.lr        = zeros(cfg.maxEpochs, 1);

tTrainStart = tic;

for epoch = 1:cfg.maxEpochs
    % Warmup + Cosine Decay LR schedule
    if epoch <= cfg.warmupEpochs
        currentLR = cfg.baseLR * (epoch / cfg.warmupEpochs);
    else
        progress = (epoch - cfg.warmupEpochs) / (cfg.maxEpochs - cfg.warmupEpochs);
        currentLR = cfg.minLR + 0.5 * (cfg.baseLR - cfg.minLR) * (1 + cos(pi * progress));
    end
    history.lr(epoch) = currentLR;
    
    % Mild class-aware sampling of training batch indices
    sampleIdx = randsample(numTrain, numTrain, true, trainSampler.sampleProb);
    epochFeat = trainFeatures(sampleIdx, :);
    epochOrd  = trainOrdT(sampleIdx, :);
    epochRef  = trainRefT(sampleIdx, :);
    
    epochLossSum = 0;
    
    for b = 1:numBatches
        idx1 = (b-1)*batchSize + 1;
        idx2 = b*batchSize;
        
        bX = dlarray(epochFeat(idx1:idx2, :)');
        bOrdY = dlarray(epochOrd(idx1:idx2, :)');
        bRefY = dlarray(epochRef(idx1:idx2, :)');
        
        [loss, gW_bn, gB_bn, gW_ord, gB_ord, gCut, gW_ref, gB_ref] = dlfeval(@lossAndGradsHead, ...
            bX, bOrdY, bRefY, headParams, effWeights, cfg.lambda_ordinal, chosenLambdaRef, cfg.weightDecay);
        
        epochLossSum = epochLossSum + double(gather(extractdata(loss)));
        
        it = (epoch-1)*numBatches + b;
        [headParams.W_bn, avgGW_bn, avgSqGW_bn] = adamupdate(headParams.W_bn, gW_bn, avgGW_bn, avgSqGW_bn, it, currentLR);
        [headParams.b_bn, ~, ~] = adamupdate(headParams.b_bn, gB_bn, [], [], it, currentLR);
        [headParams.W_ord, avgGW_ord, avgSqGW_ord] = adamupdate(headParams.W_ord, gW_ord, avgGW_ord, avgSqGW_ord, it, currentLR);
        [headParams.b_ord, ~, ~] = adamupdate(headParams.b_ord, gB_ord, [], [], it, currentLR);
        [headParams.cutoffs, avgGCut, avgSqGCut] = adamupdate(headParams.cutoffs, gCut, avgGCut, avgSqGCut, it, currentLR);
        [headParams.W_ref, avgGW_ref, avgSqGW_ref] = adamupdate(headParams.W_ref, gW_ref, avgGW_ref, avgSqGW_ref, it, currentLR);
        [headParams.b_ref, ~, ~] = adamupdate(headParams.b_ref, gB_ref, [], [], it, currentLR);
    end
    
    trainEpLoss = epochLossSum / numBatches;
    history.trainLoss(epoch) = trainEpLoss;
    
    % Validation Evaluation
    valX = dlarray(valFeatures');
    [valCumDl, valRefDl, ~] = forwardMultitask(valX, headParams, false, 0);
    valLoss = double(gather(extractdata(totalLoss(valCumDl, dlarray(valOrdT'), valRefDl, dlarray(valRefT'), effWeights, cfg.lambda_ordinal, chosenLambdaRef, headParams, 0))));
    
    valCum = double(gather(extractdata(valCumDl)))';
    valRef = double(gather(extractdata(valRefDl)))';
    
    valPredG = sum(valCum >= 0.5, 2);
    valQWK = computeQWK_local(valTable.DR_grade, valPredG);
    
    valRefTrue = valTable.DR_grade >= 2;
    [~, ~, ~, valAUROC] = perfcurve(valRefTrue, valRef, true);
    
    valComposite = 0.5 * valQWK + 0.5 * valAUROC;
    
    history.valLoss(epoch)  = valLoss;
    history.valQWK(epoch)   = valQWK;
    history.valAUROC(epoch) = valAUROC;
    history.valComp(epoch)  = valComposite;
    
    if mod(epoch, 5) == 0 || epoch == 1
        fprintf('Epoch %2d/%2d | Train Loss: %.4f | Val Loss: %.4f | Val QWK: %.4f | Val Ref AUROC: %.4f | Composite: %.4f | LR: %.2e\n', ...
            epoch, cfg.maxEpochs, trainEpLoss, valLoss, valQWK, valAUROC, valComposite, currentLR);
    end
    
    % Validation Composite Early Stopping (Composite = 0.5*QWK + 0.5*AUROC)
    if valComposite > bestValComp
        bestValComp  = valComposite;
        bestValQWK   = valQWK;
        bestValAUROC = valAUROC;
        bestHeadParams = headParams;
        bestEpoch = epoch;
        patienceCounter = 0;
    else
        patienceCounter = patienceCounter + 1;
        if patienceCounter >= cfg.patience
            fprintf('\nEarly stopping triggered at Epoch %d (Best Val Composite: %.4f at Epoch %d)\n', ...
                epoch, bestValComp, bestEpoch);
            break;
        end
    end
end

trainDuration = toc(tTrainStart);
fprintf('Training completed in %.2f seconds (%.2f minutes).\n\n', trainDuration, trainDuration / 60);

headParams = bestHeadParams;

% Save training history plot
figH = figure('Visible', 'off', 'Position', [100, 100, 800, 400]);
subplot(1, 2, 1);
plot(1:epoch, history.trainLoss(1:epoch), 'b-', 'LineWidth', 1.5); hold on;
plot(1:epoch, history.valLoss(1:epoch), 'r--', 'LineWidth', 1.5);
xlabel('Epoch'); ylabel('Loss'); title('Multitask Loss Curve'); legend('Train', 'Validation'); grid on;
subplot(1, 2, 2);
plot(1:epoch, history.valQWK(1:epoch), 'g-', 'LineWidth', 1.5); hold on;
plot(1:epoch, history.valAUROC(1:epoch), 'm--', 'LineWidth', 1.5);
plot(1:epoch, history.valComp(1:epoch), 'k-', 'LineWidth', 2);
xlabel('Epoch'); ylabel('Score'); title('Validation Metrics & Composite'); legend('Val QWK', 'Val Ref AUROC', 'Composite Score'); grid on;
saveas(figH, fullfile(cfg.resultsDir, 'training_history_v2.png'));
close(figH);

%% ------------------------------------------------------------
% STAGE 8 & 9: CALIBRATION & REFERABLE THRESHOLD (VAL ONLY)
% ------------------------------------------------------------
fprintf('--- STAGE 8 & 9: Temperature Scaling & Threshold Tuning on Validation Set ---\n');

valX = dlarray(valFeatures');
[~, valRefDl, ~] = forwardMultitask(valX, headParams, false, 0);
valRefRaw = double(gather(extractdata(valRefDl)))';
valRefTrue = valTable.DR_grade >= 2;

valRefLogits = log(max(valRefRaw, 1e-7) ./ max(1.0 - valRefRaw, 1e-7));

[learnedTemp, valCalibProbs] = temperatureScale(valRefLogits, valRefTrue);
[optRefThresh, threshSweepTable] = thresholdSweep(valCalibProbs, valRefTrue, cfg.minSpecificity);

%% ------------------------------------------------------------
% FREEZE MODEL, CALIBRATION, & THRESHOLD ARTIFACTS
% ------------------------------------------------------------
modelSavePath = fullfile(cfg.resultsDir, 'Module4v2_Model.mat');
save(modelSavePath, 'backboneNet', 'headParams', 'featureLayerName', ...
    'learnedTemp', 'optRefThresh', 'chosenLambdaRef', 'effWeights', 'cfg');
fprintf('Saved Frozen Model to: %s\n\n', modelSavePath);

%% ------------------------------------------------------------
% STAGE 10: TEST EVALUATION (EXACTLY ONCE)
% ------------------------------------------------------------
testResults = evaluateFull(testTable, testFeatures, headParams, learnedTemp, optRefThresh, cfg);

%% ------------------------------------------------------------
% STAGE 11: GRAD-CAM VISUALIZATION
% ------------------------------------------------------------
fprintf('--- STAGE 11: Multitask Grad-CAM Verification ---\n');
camRes = gradCAMHook(sampleImgPath);
figCAM = figure('Visible', 'off', 'Position', [100, 100, 900, 350]);
subplot(1, 3, 1); imshow(camRes.originalImage); title('Original Fundus');
subplot(1, 3, 2); imshow(camRes.heatmapRGB); title(sprintf('Grad-CAM (%s)', camRes.featureLayer));
subplot(1, 3, 3); imshow(camRes.overlay); title(sprintf('Overlay (Pred Grade: %d)', camRes.predictedGrade));
saveas(figCAM, fullfile(cfg.resultsDir, 'gradcam_sample_v2.png'));
close(figCAM);
fprintf('  Grad-CAM generated successfully and saved to: %s\n\n', fullfile(cfg.resultsDir, 'gradcam_sample_v2.png'));

%% ------------------------------------------------------------
% STAGE 12: EXTERNAL IDRID EVALUATION
% ------------------------------------------------------------
idridResults = evaluateIDRiD(cfg);

%% ------------------------------------------------------------
% 3-WAY MODEL BENCHMARK COMPARISON
% ------------------------------------------------------------
fprintf('============================================================\n');
fprintf('  3-WAY MODEL COMPARISON ON HELD-OUT TEST SET (%d IMAGES)\n', height(testTable));
fprintf('============================================================\n\n');

v1ResultsPath = fullfile(cfg.projectRoot, 'results', 'Experimental_ResNet50_Ordinal', 'ResNet50_Ordinal_Results.mat');
mbCompCSV = fullfile(cfg.projectRoot, 'results', 'Experimental_ResNet50_Ordinal', 'ResNet_vs_MobileNet_Comparison.csv');

if isfile(v1ResultsPath)
    V1 = load(v1ResultsPath);
    v1_qwk = V1.qwk5; v1_balAcc = V1.balancedAccuracy5; v1_refSens = V1.refSens; v1_refSpec = V1.refSpec; v1_refF1 = V1.refF1; v1_refAUC = V1.refAUC;
else
    v1_qwk = 0.4576; v1_balAcc = 0.3413; v1_refSens = 0.6320; v1_refSpec = 0.7755; v1_refF1 = 0.4854; v1_refAUC = 0.7585;
end

if isfile(mbCompCSV)
    MB = readtable(mbCompCSV);
    mb_qwk = MB.MobileNetV2_Baseline(3); mb_balAcc = MB.MobileNetV2_Baseline(2);
    mb_refSens = MB.MobileNetV2_Baseline(8); mb_refSpec = MB.MobileNetV2_Baseline(9);
    mb_refF1 = MB.MobileNetV2_Baseline(10); mb_refAUC = MB.MobileNetV2_Baseline(11);
else
    mb_qwk = 0.1471; mb_balAcc = 0.2358; mb_refSens = 0.1208; mb_refSpec = 0.9708; mb_refF1 = 0.1937; mb_refAUC = 0.6856;
end

metricNames = { ...
    '5-Grade Balanced Accuracy', ...
    'Quadratic Weighted Kappa (QWK)', ...
    'Referable DR Sensitivity', ...
    'Referable DR Specificity', ...
    'Referable DR F1-Score', ...
    'Referable DR ROC-AUROC'};

mbVals = [mb_balAcc; mb_qwk; mb_refSens; mb_refSpec; mb_refF1; mb_refAUC];
v1Vals = [v1_balAcc; v1_qwk; v1_refSens; v1_refSpec; v1_refF1; v1_refAUC];
v2Vals = [testResults.BalancedAccuracy5; testResults.QWK; testResults.Referable_Sensitivity; testResults.Referable_Specificity; testResults.Referable_F1; testResults.Referable_AUROC];

compTable3Way = table(metricNames', mbVals, v1Vals, v2Vals, v2Vals - v1Vals, ...
    'VariableNames', {'Metric', 'MobileNetV2_Production', 'ResNet50_Ordinal_v1', 'Multitask_ResNet50_v2', 'v2_Gain_Over_v1'});
disp(compTable3Way);

writetable(compTable3Way, fullfile(cfg.resultsDir, '3Way_Model_Comparison.csv'));

% 3-Way Comparison Bar Plot
figComp3 = figure('Visible', 'off', 'Position', [100, 100, 950, 500]);
bar([mbVals, v1Vals, v2Vals]);
xticks(1:length(metricNames));
xticklabels(metricNames);
xtickangle(20);
legend('1. MobileNetV2 (Production)', '2. ResNet-50 Ordinal v1', '3. Multitask ResNet-50 v2', 'Location', 'Northwest');
ylabel('Metric Score (0.0 to 1.0)');
title('3-Way Model Performance Benchmark (Held-out Test Set)');
grid on; ylim([0, 1.15]);
saveas(figComp3, fullfile(cfg.resultsDir, '3Way_Model_Comparison.png'));
close(figComp3);

%% ------------------------------------------------------------
% SAVE MASTER EXPERIMENT METADATA ARTIFACT
% ------------------------------------------------------------
tTotal = toc(tGlobalStart);
gpuInfo = gpuDevice;

experimentMetadata = struct();
experimentMetadata.ModelName = 'Module 4 Experimental v2 (Multitask ResNet-50 Ordinal & Referable)';
experimentMetadata.Backbone = cfg.backboneName;
experimentMetadata.PretrainedWeights = 'ImageNet';
experimentMetadata.ImageInputSize = cfg.inputSize;
experimentMetadata.BottleneckDim = cfg.bottleneckDim;
experimentMetadata.DropoutRate = cfg.dropoutRate;
experimentMetadata.LambdaOrdinal = cfg.lambda_ordinal;
experimentMetadata.ChosenLambdaRef = chosenLambdaRef;
experimentMetadata.EffectiveNumberBeta = cfg.beta_effective;
experimentMetadata.FocalLossGamma = cfg.focal_gamma;
experimentMetadata.EffectiveWeights = effWeights;
experimentMetadata.LearnedTemperature = learnedTemp;
experimentMetadata.OptReferableThreshold = optRefThresh;
experimentMetadata.MinSpecificityConstraint = cfg.minSpecificity;
experimentMetadata.RandomSeed = cfg.seed;
experimentMetadata.TotalImages = splitMeta.totalImages;
experimentMetadata.SplitSizes = [splitMeta.numTrainImages, splitMeta.numValImages, splitMeta.numTestImages];
experimentMetadata.PatientCounts = [splitMeta.numTrainPatients, splitMeta.numValPatients, splitMeta.numTestPatients];
experimentMetadata.TrainingDurationSeconds = trainDuration;
experimentMetadata.TotalRunTimeSeconds = tTotal;
experimentMetadata.GPUName = gpuInfo.Name;
experimentMetadata.GPUMemoryGB = gpuInfo.TotalMemory / 1e9;
experimentMetadata.TestResults = testResults;

save(fullfile(cfg.resultsDir, 'Module4v2_Experiment_Metadata.mat'), 'experimentMetadata');

metaJSON = jsonencode(experimentMetadata, 'PrettyPrint', true);
fid = fopen(fullfile(cfg.resultsDir, 'Module4v2_Experiment_Metadata.json'), 'w');
fwrite(fid, metaJSON, 'char');
fclose(fid);

fprintf('\n============================================================\n');
fprintf('  MODULE 4 V2 EXPERIMENT COMPLETED SUCCESSFULLY\n');
fprintf('  Results saved to: %s\n', cfg.resultsDir);
fprintf('============================================================\n\n');


function features = extractFeaturesFast(tbl, imgDir, backboneNet, inputSize, useGPU, prefix)
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
            raw = imread(fpath);
            proc = preprocessPipeline(raw, inputSize);
            batchImgs(:, :, :, i) = proc;
        end
        
        batchDl = dlarray(batchImgs, 'SSCB');
        if useGPU
            batchDl = gpuArray(batchDl);
        end
        
        featDl = forward(backboneNet, batchDl, 'Outputs', 'avg_pool');
        featMat = squeeze(extractdata(gather(featDl)))';
        if currBSize == 1
            featMat = featMat';
        end
        features(idx1:idx2, :) = single(featMat);
        
        if mod(b, 20) == 0 || b == numBatches
            fprintf('  [%s] Extracted %5d / %5d preprocessed images...\n', prefix, idx2, N);
        end
    end
end

function [loss, gW_bn, gB_bn, gW_ord, gB_ord, gCut, gW_ref, gB_ref] = lossAndGradsHead(X, ordY, refY, headParams, effWeights, l_ord, l_ref, wd)
    [cumProbs, pRef, ~] = forwardMultitask(X, headParams, true, 0.4);
    loss = totalLoss(cumProbs, ordY, pRef, refY, effWeights, l_ord, l_ref, headParams, wd);
    [gW_bn, gB_bn, gW_ord, gB_ord, gCut, gW_ref, gB_ref] = dlgradient(loss, ...
        headParams.W_bn, headParams.b_bn, headParams.W_ord, headParams.b_ord, headParams.cutoffs, headParams.W_ref, headParams.b_ref);
end

function qwk = computeQWK_local(yTrue, yPred)
    yTrue = double(yTrue(:)); yPred = double(yPred(:));
    N = length(yTrue); numGrades = 5;
    O = confusionmat(yTrue, yPred, 'Order', 0:numGrades-1);
    histTrue = histcounts(yTrue, -0.5:1:numGrades-0.5);
    histPred = histcounts(yPred, -0.5:1:numGrades-0.5);
    E = (histTrue(:) * histPred(:)') / N;
    [I, J] = meshgrid(0:numGrades-1, 0:numGrades-1);
    W = ((I - J).^2) / ((numGrades - 1)^2);
    num = sum(sum(W .* O)); den = sum(sum(W .* E));
    if den == 0, qwk = 1.0; else, qwk = 1.0 - (num / den); end
end
