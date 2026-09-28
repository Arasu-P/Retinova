%% ============================================================
%  RUNBRANCHBVALIDATION - Master Branch-B Feature Extraction & Feasibility Test
%  Module 4 Experimental v3 (NetraAI / SIH26038)
% ============================================================

clear; clc; close all;

fprintf('\n============================================================\n');
fprintf('  MODULE 4 EXPERIMENTAL V3: BRANCH-B FEATURE VALIDATION\n');
fprintf('  Validating Existing Module 3 Evidence for DR Screening\n');
fprintf('============================================================\n\n');

v3Dir = fullfile(fileparts(mfilename('fullpath')), '..');
addpath(genpath(v3Dir));
addpath(fullfile(v3Dir, '..', 'module3_Segmentation'));
addpath(fullfile(v3Dir, '..', 'module4_Grading_Experimental_v2'));

resultsDir = fullfile(v3Dir, 'results');
if ~exist(resultsDir, 'dir'), mkdir(resultsDir); end

%% ------------------------------------------------------------
% STEP 1: LOAD EXACT PATIENT-LEVEL SPLIT
%% ------------------------------------------------------------
splitsPath = fullfile(v3Dir, '..', 'results', 'Experimental_ResNet50_Ordinal', 'ResNet50_Ordinal_Splits.mat');
if ~isfile(splitsPath)
    error('Patient-level splits artifact not found: %s', splitsPath);
end

S = load(splitsPath);
trainTable = S.trainTable;
valTable   = S.valTable;
testTable  = S.testTable;

fprintf('Loaded Split -> Train: %d, Val: %d, Test: %d (Total: %d images)\n', ...
    height(trainTable), height(valTable), height(testTable), ...
    height(trainTable) + height(valTable) + height(testTable));

imgDir = 'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\data\EyePACS\download\train\extracted\train';

%% ------------------------------------------------------------
% STEP 2 & 5: EXTRACT BRANCH-B FEATURES (WITH CHECKPOINTING)
%% ------------------------------------------------------------
featuresMatPath = fullfile(resultsDir, 'BranchB_Features.mat');

if isfile(featuresMatPath)
    fprintf('\nLoading existing Branch-B features from: %s\n', featuresMatPath);
    load(featuresMatPath, 'trainFeats', 'valFeats', 'testFeats', 'featNames');
else
    fprintf('\nExtracting Branch-B features across Train/Val/Test using Parallel Pool...\n');
    
    % Start parallel pool if not already running
    p = gcp('nocreate');
    if isempty(p)
        try
            parpool('local', 6);
        catch
            fprintf('Parallel pool start skipped or failed. Running serially.\n');
        end
    end
    
    extractSplit = @(tbl, prefix) extractSplitFeaturesParallel(tbl, imgDir, prefix, resultsDir);
    
    trainFeats = extractSplit(trainTable, 'Train');
    valFeats   = extractSplit(valTable, 'Val');
    testFeats  = extractSplit(testTable, 'Test');
    
    % Get feature names
    dummyRaw = imread(fullfile(imgDir, string(trainTable.image{1})));
    [dummyLesion, dummyVessel, dummyDebug] = segment_lesions(dummyRaw);
    [~, featNames] = extractBranchBFeatures(dummyLesion, dummyVessel, dummyDebug);
    
    save(featuresMatPath, 'trainFeats', 'valFeats', 'testFeats', 'featNames', '-v7.3');
    fprintf('Saved Branch-B features to: %s\n', featuresMatPath);
end

numFeats = length(featNames);
fprintf('Total Branch-B Features per image: %d\n', numFeats);

%% ------------------------------------------------------------
% STEP 4: CREATE FULL FEATURE TABLE & METADATA JSON
%% ------------------------------------------------------------
fullTable = [trainTable; valTable; testTable];
fullFeats = [trainFeats; valFeats; testFeats];
datasetTags = [repmat({'train'}, height(trainTable), 1); ...
               repmat({'val'}, height(valTable), 1); ...
               repmat({'test'}, height(testTable), 1)];

outTbl = table();
outTbl.image_id = string(fullTable.image);
if ismember('patientID', fullTable.Properties.VariableNames)
    outTbl.patient_id = fullTable.patientID;
else
    outTbl.patient_id = fullTable.patient_id;
end
outTbl.dataset = string(datasetTags);
if ismember('DR_grade', fullTable.Properties.VariableNames)
    outTbl.grade = fullTable.DR_grade;
    trainGrade = trainTable.DR_grade;
    valGrade = valTable.DR_grade;
else
    outTbl.grade = fullTable.dr_grade;
    trainGrade = trainTable.dr_grade;
    valGrade = valTable.dr_grade;
end
outTbl.referable_label = double(outTbl.grade >= 2);

for f = 1:numFeats
    outTbl.(featNames{f}) = fullFeats(:, f);
end

featuresCsvPath = fullfile(resultsDir, 'BranchB_Features.csv');
writetable(outTbl, featuresCsvPath);
fprintf('Saved full feature table to: %s\n', featuresCsvPath);

% Metadata JSON
metaStruct = struct();
for f = 1:numFeats
    fn = featNames{f};
    entry = struct();
    entry.feature_name = fn;
    if contains(fn, 'vessel')
        entry.source = 'Module 3 vesselMask / vesselSkelStd';
        entry.units = 'pixels or ratio';
    elseif contains(fn, 'candidate') || contains(fn, 'bright') || contains(fn, 'dark') || contains(fn, 'q1') || contains(fn, 'q2') || contains(fn, 'q3') || contains(fn, 'q4')
        entry.source = 'Module 3 lesionMask / brightLesionMask / darkLesionMask';
        entry.units = 'pixels, count, or ratio';
    else
        entry.source = 'Module 3 FOV & quality debug masks';
        entry.units = 'ratio or binary flag';
    end
    entry.missing_policy = 'Impute zero or median';
    metaStruct.(fn) = entry;
end
metaJsonStr = jsonencode(metaStruct, 'PrettyPrint', true);
fid = fopen(fullfile(resultsDir, 'BranchB_Feature_Metadata.json'), 'w');
fwrite(fid, metaJsonStr, 'char');
fclose(fid);

%% ------------------------------------------------------------
% STEP 6: QUALITY CONTROL & STATISTICAL DISTRIBUTION
%% ------------------------------------------------------------
fprintf('\n--- STEP 6: Branch-B Feature Quality Control ---\n');
qcTable = table();
qcTable.feature_name = featNames';
qcTable.missing_pct = zeros(numFeats, 1);
qcTable.min_val = zeros(numFeats, 1);
qcTable.max_val = zeros(numFeats, 1);
qcTable.mean_val = zeros(numFeats, 1);
qcTable.median_val = zeros(numFeats, 1);
qcTable.std_val = zeros(numFeats, 1);
qcTable.p1_val = zeros(numFeats, 1);
qcTable.p25_val = zeros(numFeats, 1);
qcTable.p50_val = zeros(numFeats, 1);
qcTable.p75_val = zeros(numFeats, 1);
qcTable.p99_val = zeros(numFeats, 1);
qcTable.near_zero_var = false(numFeats, 1);

for f = 1:numFeats
    vals = double(fullFeats(:, f));
    qcTable.missing_pct(f) = 100 * sum(isnan(vals)) / length(vals);
    valsClean = vals(~isnan(vals));
    if isempty(valsClean)
        continue;
    end
    qcTable.min_val(f) = min(valsClean);
    qcTable.max_val(f) = max(valsClean);
    qcTable.mean_val(f) = mean(valsClean);
    qcTable.median_val(f) = median(valsClean);
    qcTable.std_val(f) = std(valsClean);
    pcts = prctile(valsClean, [1, 25, 50, 75, 99]);
    qcTable.p1_val(f) = pcts(1);
    qcTable.p25_val(f) = pcts(2);
    qcTable.p50_val(f) = pcts(3);
    qcTable.p75_val(f) = pcts(4);
    qcTable.p99_val(f) = pcts(5);
    if qcTable.std_val(f) < 1e-6
        qcTable.near_zero_var(f) = true;
    end
end

qcCsvPath = fullfile(resultsDir, 'BranchB_Feature_QC.csv');
writetable(qcTable, qcCsvPath);
fprintf('Saved Quality Control statistics to: %s\n', qcCsvPath);

%% ------------------------------------------------------------
% STEP 7: VALIDATION-ONLY SIGNAL TEST (MODELS B1, B2, B3)
%% ------------------------------------------------------------
fprintf('\n============================================================\n');
fprintf('  STEP 7: VALIDATION-ONLY SIGNAL BENCHMARK (NO TEST SET)\n');
fprintf('============================================================\n');

yTrain = double(trainGrade >= 2);
yVal   = double(valGrade >= 2);

% Handle NaNs and Standardize features
[XTrainNorm, mu, sigma] = zscore(trainFeats);
sigma(sigma == 0) = 1;
XValNorm = (valFeats - mu) ./ sigma;
XTrainNorm(isnan(XTrainNorm)) = 0;
XValNorm(isnan(XValNorm)) = 0;

% Model B1: Logistic Regression (Regularized Ridge/L2)
fprintf('Training Model B1: Logistic Regression...\n');
mdlB1 = fitclinear(XTrainNorm, yTrain, 'Learner', 'logistic', 'Regularization', 'ridge');
[~, scoreB1] = predict(mdlB1, XValNorm);
probB1 = scoreB1(:, 2);

% Model B2: Support Vector Machine (RBF Kernel)
fprintf('Training Model B2: RBF Support Vector Machine...\n');
mdlB2 = fitcsvm(XTrainNorm, yTrain, 'KernelFunction', 'rbf', 'Standardize', false, 'ClassNames', [0, 1]);
mdlB2 = fitPosterior(mdlB2);
[~, scoreB2] = predict(mdlB2, XValNorm);
probB2 = scoreB2(:, 2);

% Model B3: Random Forest / Gradient Boosted Ensemble
fprintf('Training Model B3: Tree Ensemble (TreeBagger)...\n');
mdlB3 = TreeBagger(100, XTrainNorm, yTrain, 'Method', 'classification', 'OOBPrediction', 'on', 'OOBPredictorImportance', 'on');
[~, scoreB3] = predict(mdlB3, XValNorm);
probB3 = scoreB3(:, 2);

% Evaluate Models on Validation Set
evalModel = @(prob, name) evaluateValidationSignal(prob, yVal, name);

resB1 = evalModel(probB1, 'Model B1 (Logistic Regression)');
resB2 = evalModel(probB2, 'Model B2 (RBF SVM)');
resB3 = evalModel(probB3, 'Model B3 (Random Forest)');

modelResultsTable = table( ...
    {'Model B1 (Logistic Reg)'; 'Model B2 (RBF SVM)'; 'Model B3 (Random Forest)'}, ...
    [resB1.AUROC; resB2.AUROC; resB3.AUROC], ...
    [resB1.AUPRC; resB2.AUPRC; resB3.AUPRC], ...
    [resB1.Sensitivity; resB2.Sensitivity; resB3.Sensitivity], ...
    [resB1.Specificity; resB2.Specificity; resB3.Specificity], ...
    [resB1.F1; resB2.F1; resB3.F1], ...
    [resB1.BalancedAcc; resB2.BalancedAcc; resB3.BalancedAcc], ...
    [resB1.Achieves90_85; resB2.Achieves90_85; resB3.Achieves90_85], ...
    'VariableNames', {'Model', 'Val_AUROC', 'Val_AUPRC', 'Val_Sensitivity', 'Val_Specificity', 'Val_F1', 'Val_BalancedAcc', 'Meets_90Sens_85Spec'} ...
);

disp(modelResultsTable);

%% ------------------------------------------------------------
% STEP 8: FEATURE IMPORTANCE & RELATIONSHIP WITH GRADE
%% ------------------------------------------------------------
fprintf('\n--- STEP 8: Branch-B Relationship with Severity Grade ---\n');
gradeTrain = double(trainGrade);

featImpTable = table();
featImpTable.feature_name = featNames';
featImpTable.grade_correlation = zeros(numFeats, 1);
featImpTable.referable_effect_size_cohen_d = zeros(numFeats, 1);
featImpTable.rf_feature_importance = zeros(numFeats, 1);
featImpTable.univariate_val_auroc = zeros(numFeats, 1);

% TreeBagger Feature Importance
impOOB = mdlB3.OOBPermutedPredictorDeltaError;
featImpTable.rf_feature_importance = impOOB';

for f = 1:numFeats
    vTrain = double(trainFeats(:, f));
    vVal   = double(valFeats(:, f));
    
    % Correlation with grade
    r = corr(vTrain, gradeTrain, 'Type', 'Spearman', 'Rows', 'complete');
    if isnan(r), r = 0; end
    featImpTable.grade_correlation(f) = r;
    
    % Effect size Cohen's d between referable and non-referable
    refVals = vTrain(yTrain == 1);
    nonRefVals = vTrain(yTrain == 0);
    sPooled = sqrt(((length(refVals)-1)*var(refVals) + (length(nonRefVals)-1)*var(nonRefVals)) / (length(refVals) + length(nonRefVals) - 2));
    if sPooled > 1e-8
        featImpTable.referable_effect_size_cohen_d(f) = (mean(refVals) - mean(nonRefVals)) / sPooled;
    else
        featImpTable.referable_effect_size_cohen_d(f) = 0;
    end
    
    % Univariate ROC-AUC on validation set
    try
        [~, ~, ~, aurocVal] = perfcurve(yVal, vVal, 1);
        if aurocVal < 0.5, aurocVal = 1 - aurocVal; end
        featImpTable.univariate_val_auroc(f) = aurocVal;
    catch
        featImpTable.univariate_val_auroc(f) = 0.5;
    end
end

% Sort by Random Forest Importance
featImpTable = sortrows(featImpTable, 'rf_feature_importance', 'descend');
impCsvPath = fullfile(resultsDir, 'BranchB_FeatureImportance.csv');
writetable(featImpTable, impCsvPath);
fprintf('Saved Feature Importance table to: %s\n', impCsvPath);

% Plot Top 10 Features
figImp = figure('Visible', 'off', 'Position', [100 100 1000 600]);
top10 = featImpTable(1:min(10, height(featImpTable)), :);
barh(top10.rf_feature_importance, 'FaceColor', [0.15 0.55 0.85]);
set(gca, 'YTick', 1:height(top10), 'YTickLabel', top10.feature_name, 'YDir', 'reverse');
xlabel('Out-of-Bag Permuted Feature Importance');
title('Top 10 Branch-B Retinal Features for DR Severity');
grid on;
saveas(figImp, fullfile(resultsDir, 'BranchB_TopFeatures.png'));
close(figImp);

%% ------------------------------------------------------------
% STEP 9: HARD CASE ANALYSIS ON VALIDATION SET
%% ------------------------------------------------------------
fprintf('\n--- STEP 9: Hard Case Analysis on Validation Set ---\n');
valGrades = valGrade;
valPreds = probB3 >= 0.5; % Default threshold

fn_idx = find(yVal == 1 & valPreds == 0);
fp_idx = find(yVal == 0 & valPreds == 1);
g1_to_ref_idx = find(valGrades == 1 & valPreds == 1);
g2_to_nonref_idx = find(valGrades == 2 & valPreds == 0);
g3g4_to_nonref_idx = find((valGrades == 3 | valGrades == 4) & valPreds == 0);

fprintf('Validation Cases Breakdown (Model B3):\n');
fprintf('  Total False Negatives (G2-4 missed): %d / %d\n', length(fn_idx), sum(yVal == 1));
fprintf('  Total False Positives (G0-1 overcalled): %d / %d\n', length(fp_idx), sum(yVal == 0));
fprintf('  Grade 1 -> False Referable Errors: %d\n', length(g1_to_ref_idx));
fprintf('  Grade 2 -> Missed (Predicted Non-Ref): %d\n', length(g2_to_nonref_idx));
fprintf('  Grade 3/4 -> Severe Misses: %d\n', length(g3g4_to_nonref_idx));

%% ------------------------------------------------------------
% STEP 10: BRANCH-A VS BRANCH-B VS FUSION FEASIBILITY TEST
%% ------------------------------------------------------------
fprintf('\n============================================================\n');
fprintf('  STEP 10: BRANCH-A vs BRANCH-B vs CONCATENATED FUSION\n');
fprintf('============================================================\n');

v2CachePath = fullfile(v3Dir, '..', 'module4_Grading_Experimental_v2', 'results', 'ResNet50_Features_384x384_Cache.mat');
if isfile(v2CachePath)
    fprintf('Loading Frozen ResNet-50 Features (Branch A) from Cache...\n');
    C = load(v2CachePath);
    trainBranchA = C.trainFeatures;
    valBranchA   = C.valFeatures;
    
    [trainANorm, muA, sigA] = zscore(trainBranchA);
    sigA(sigA == 0) = 1;
    valANorm = (valBranchA - muA) ./ sigA;
    trainANorm(isnan(trainANorm)) = 0;
    valANorm(isnan(valANorm)) = 0;
    
    % Model A: Branch-A CNN only (Logistic Regression / Ridge)
    fprintf('Fitting Branch-A CNN Model...\n');
    mdlA = fitclinear(trainANorm, yTrain, 'Learner', 'logistic', 'Regularization', 'ridge');
    [~, scoreA] = predict(mdlA, valANorm);
    probA = scoreA(:, 2);
    resA = evalModel(probA, 'Branch A (CNN Features Only)');
    
    % Model B: Branch-B Features only (Logistic Regression)
    resB = resB1; % already evaluated
    
    % Model C: Concatenated Fusion (Branch A + Branch B)
    trainFusion = [trainANorm, XTrainNorm];
    valFusion   = [valANorm, XValNorm];
    fprintf('Fitting Branch A + Branch B Simple Concatenated Fusion...\n');
    mdlFusion = fitclinear(trainFusion, yTrain, 'Learner', 'logistic', 'Regularization', 'ridge');
    [~, scoreFusion] = predict(mdlFusion, valFusion);
    probFusion = scoreFusion(:, 2);
    resFusion = evalModel(probFusion, 'Branch A + B Concatenated Fusion');
    
    fusionCompareTable = table( ...
        {'Branch A (CNN Only)'; 'Branch B (Retinal Evidence Only)'; 'Branch A + B Fusion (CNN + Evidence)'}, ...
        [resA.AUROC; resB.AUROC; resFusion.AUROC], ...
        [resA.AUPRC; resB.AUPRC; resFusion.AUPRC], ...
        [resA.Sensitivity; resB.Sensitivity; resFusion.Sensitivity], ...
        [resA.Specificity; resB.Specificity; resFusion.Specificity], ...
        [resA.F1; resB.F1; resFusion.F1], ...
        [resA.BalancedAcc; resB.BalancedAcc; resFusion.BalancedAcc], ...
        'VariableNames', {'Representation', 'Val_AUROC', 'Val_AUPRC', 'Val_Sensitivity', 'Val_Specificity', 'Val_F1', 'Val_BalancedAcc'} ...
    );
    
    disp(fusionCompareTable);
    writetable(fusionCompareTable, fullfile(resultsDir, 'BranchA_vs_BranchB_Comparison.csv'));
else
    fprintf('[NOTE] v2 Cache not found at: %s. Feasibility evaluated on Branch-B only.\n', v2CachePath);
end

%% ------------------------------------------------------------
% STEP 11: DECISION GATE LOGIC & REPORT
%% ------------------------------------------------------------
fprintf('\n============================================================\n');
fprintf('  STEP 11: ENGINEERING DECISION GATE\n');
fprintf('============================================================\n');

report = struct();
report.ModelB1_Results = resB1;
report.ModelB2_Results = resB2;
report.ModelB3_Results = resB3;
if exist('resFusion', 'var')
    report.BranchA_Results = resA;
    report.BranchB_Results = resB;
    report.Fusion_Results  = resFusion;
    report.Gain_AUROC = resFusion.AUROC - resA.AUROC;
    report.Gain_F1    = resFusion.F1 - resA.F1;
end

if exist('resFusion', 'var')
    if resB3.AUROC >= 0.70 && (resFusion.AUROC - resA.AUROC >= 0.02)
        decision = 'CASE 1: Branch B has strong independent signal. Proceed to full v3 deep fusion.';
    elseif resB3.AUROC >= 0.60 && (resFusion.AUROC - resA.AUROC > 0.00)
        decision = 'CASE 2: Branch B has modest signal with measurable fusion gain. Proceed to lightweight fusion.';
    else
        decision = 'CASE 3: Branch B signal is weak/noisy or gives no fusion gain. STOP before deep fusion. Improve Module 3 segmentation first.';
    end
else
    if resB3.AUROC >= 0.70
        decision = 'Branch B shows strong standalone signal.';
    else
        decision = 'Branch B standalone signal is weak. Segmentation refinement needed.';
    end
end

report.Decision = decision;
fprintf('\n>>> DECISION GATE OUTCOME: %s\n\n', decision);

reportJson = jsonencode(report, 'PrettyPrint', true);
fid = fopen(fullfile(resultsDir, 'BranchB_Feasibility_Report.json'), 'w');
fwrite(fid, reportJson, 'char');
fclose(fid);

fprintf('Branch-B Validation Complete. All artifacts saved to: %s\n', resultsDir);

%% ============================================================
% HELPER FUNCTIONS
%% ============================================================
function feats = extractSplitFeaturesParallel(tbl, imgDir, prefix, resultsDir)
    N = height(tbl);
    numFeats = 49;
    feats = zeros(N, numFeats, 'single');
    ckptPath = fullfile(resultsDir, sprintf('checkpoint_BranchB_%s.mat', prefix));
    
    startIdx = 1;
    if isfile(ckptPath)
        try
            CK = load(ckptPath);
            feats = CK.feats;
            startIdx = CK.lastIdx + 1;
            fprintf('  [%s] Resuming from checkpoint: image %d / %d\n', prefix, startIdx, N);
        catch
            startIdx = 1;
        end
    end
    
    if startIdx > N
        fprintf('  [%s] Already fully extracted (%d images).\n', prefix, N);
        return;
    end
    
    chunkSize = 250;
    numChunks = ceil((N - startIdx + 1) / chunkSize);
    imgNames = tbl.image;
    
    for c = 1:numChunks
        cStart = startIdx + (c-1)*chunkSize;
        cEnd = min(cStart + chunkSize - 1, N);
        cLen = cEnd - cStart + 1;
        
        cFeats = zeros(cLen, numFeats, 'single');
        parfor k = 1:cLen
            globalI = cStart + k - 1;
            fpath = fullfile(imgDir, string(imgNames{globalI}));
            raw = imread(fpath);
            [lesionMask, vesselMask, debug] = segment_lesions(raw);
            cFeats(k, :) = extractBranchBFeatures(lesionMask, vesselMask, debug);
        end
        feats(cStart:cEnd, :) = cFeats;
        lastIdx = cEnd;
        save(ckptPath, 'feats', 'lastIdx');
        fprintf('  [%s] Processed & checkpointed %5d / %5d images...\n', prefix, cEnd, N);
    end
end

function res = evaluateValidationSignal(prob, yTrue, modelName)
    yTrue = double(yTrue(:));
    prob = double(prob(:));
    
    [~, ~, ~, auroc] = perfcurve(yTrue, prob, 1);
    
    % Dense threshold sweep
    threshGrid = 0.01:0.01:0.99;
    bestSens = 0; bestSpec = 0; bestF1 = 0; bestBalAcc = 0;
    achieved90_85 = false;
    
    for t = threshGrid
        yPred = double(prob >= t);
        tp = sum(yTrue == 1 & yPred == 1);
        fp = sum(yTrue == 0 & yPred == 1);
        fn = sum(yTrue == 1 & yPred == 0);
        tn = sum(yTrue == 0 & yPred == 0);
        
        sens = tp / max(1, (tp + fn));
        spec = tn / max(1, (tn + fp));
        prec = tp / max(1, (tp + fp));
        f1 = 2 * (prec * sens) / max(1e-8, (prec + sens));
        balAcc = 0.5 * (sens + spec);
        
        if sens >= 0.90 && spec >= 0.85
            achieved90_85 = true;
        end
        
        if f1 > bestF1
            bestF1 = f1;
            bestSens = sens;
            bestSpec = spec;
            bestBalAcc = balAcc;
        end
    end
    
    % AUPRC
    [precCurve, recCurve] = computePRCurve(yTrue, prob);
    auprc = trapz(recCurve, precCurve);
    
    res = struct();
    res.ModelName = modelName;
    res.AUROC = auroc;
    res.AUPRC = auprc;
    res.Sensitivity = bestSens;
    res.Specificity = bestSpec;
    res.F1 = bestF1;
    res.BalancedAcc = bestBalAcc;
    res.Achieves90_85 = achieved90_85;
end

function [prec, rec] = computePRCurve(yTrue, prob)
    thresholds = sort(unique(prob), 'descend');
    rec = zeros(length(thresholds), 1);
    prec = zeros(length(thresholds), 1);
    totalPos = sum(yTrue == 1);
    
    for i = 1:length(thresholds)
        t = thresholds(i);
        yPred = double(prob >= t);
        tp = sum(yTrue == 1 & yPred == 1);
        fp = sum(yTrue == 0 & yPred == 1);
        rec(i) = tp / max(1, totalPos);
        prec(i) = tp / max(1, (tp + fp));
    end
    [rec, idx] = sort(rec);
    prec = prec(idx);
    rec = [0; rec; 1];
    prec = [1; prec; 0];
end
