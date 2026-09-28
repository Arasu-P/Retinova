function [bestLambda, sweepResults] = lambdaCalibrationSweep(trainFeat, trainOrdT, trainRefT, valFeat, valOrdT, valRefT, valTable, effWeights, cfg)
% LAMBDACALIBRATIONSWEEP - Evaluates lambda_ref in [0.3, 0.5, 0.75, 1.0] on validation set
% under identical conditions. Selects smallest lambda_ref that improves validation referable AUROC
% over baseline without reducing validation QWK by >0.02.

fprintf('\n============================================================\n');
fprintf('  STAGE 6: LAMBDA_REF CALIBRATION SWEEP\n');
fprintf('  Candidates: [%s]\n', num2str(cfg.lambda_ref_candidates));
fprintf('============================================================\n\n');

candidates = cfg.lambda_ref_candidates;
numC = length(candidates);

valQWKs   = zeros(numC, 1);
valAUROCs = zeros(numC, 1);
valF1s    = zeros(numC, 1);

% Evaluate baseline (lambda_ref = 0.0) first for reference
fprintf('Evaluating Baseline (lambda_ref = 0.0)...\n');
[baseHead, ~] = quickTrainHead(trainFeat, trainOrdT, trainRefT, valFeat, valOrdT, valRefT, effWeights, 1.0, 0.0, cfg, 20);
[baseQWK, baseAUROC, baseF1] = evalValMetrics(valFeat, valTable, baseHead);
fprintf('Baseline -> Val QWK: %.4f | Val Ref AUROC: %.4f | Val Ref F1: %.4f\n\n', baseQWK, baseAUROC, baseF1);

for i = 1:numC
    l_ref = candidates(i);
    fprintf('Running sweep for lambda_ref = %.2f...\n', l_ref);
    [currHead, ~] = quickTrainHead(trainFeat, trainOrdT, trainRefT, valFeat, valOrdT, valRefT, effWeights, 1.0, l_ref, cfg, 20);
    [q, a, f] = evalValMetrics(valFeat, valTable, currHead);
    
    valQWKs(i)   = q;
    valAUROCs(i) = a;
    valF1s(i)    = f;
    
    fprintf('  lambda_ref = %.2f -> Val QWK: %.4f | Val Ref AUROC: %.4f | Val Ref F1: %.4f\n', l_ref, q, a, f);
end

% Selection: Smallest lambda_ref that improves validation referable AUROC over baseline without reducing QWK by > 0.02
chosenIdx = 1;
found = false;

for i = 1:numC
    deltaAUROC = valAUROCs(i) - baseAUROC;
    deltaQWK   = valQWKs(i) - baseQWK;
    
    if (deltaAUROC > 0) && (deltaQWK >= -0.02)
        chosenIdx = i;
        found = true;
        break;
    end
end

if ~found
    % Fallback to highest composite score
    compScore = 0.5 * valQWKs + 0.5 * valAUROCs;
    [~, chosenIdx] = max(compScore);
end

bestLambda = candidates(chosenIdx);
fprintf('\n>>> Selected Optimal lambda_ref: %.2f (Val QWK: %.4f, Val Ref AUROC: %.4f)\n\n', ...
    bestLambda, valQWKs(chosenIdx), valAUROCs(chosenIdx));

sweepResults = table(candidates', valQWKs, valAUROCs, valF1s, ...
    'VariableNames', {'lambda_ref', 'Validation_QWK', 'Validation_Ref_AUROC', 'Validation_Ref_F1'});
disp(sweepResults);

save(fullfile(cfg.resultsDir, 'lambda_sweep_results.mat'), 'sweepResults', 'bestLambda', 'baseQWK', 'baseAUROC');

end

function [headParams, history] = quickTrainHead(trainFeat, trainOrdT, trainRefT, valFeat, valOrdT, valRefT, effWeights, l_ord, l_ref, cfg, epochs)
    headParams = buildMultitaskHead(cfg);
    N = size(trainFeat, 1);
    batchSize = 64;
    numBatches = floor(N / batchSize);
    
    avgGW_bn = []; avgSqGW_bn = [];
    avgGW_ord = []; avgSqGW_ord = [];
    avgGW_ref = []; avgSqGW_ref = [];
    avgGCut = []; avgSqGCut = [];
    
    lr = 2e-3;
    history = zeros(epochs, 1);
    
    for ep = 1:epochs
        p = randperm(N);
        fShuff = trainFeat(p, :);
        oShuff = trainOrdT(p, :);
        rShuff = trainRefT(p, :);
        
        for b = 1:numBatches
            idx1 = (b-1)*batchSize + 1;
            idx2 = b*batchSize;
            
            bX = dlarray(fShuff(idx1:idx2, :)');
            bOrdY = dlarray(oShuff(idx1:idx2, :)');
            bRefY = dlarray(rShuff(idx1:idx2, :)');
            
            [loss, gW_bn, gB_bn, gW_ord, gB_ord, gCut, gW_ref, gB_ref] = dlfeval(@lossAndGradsHead, ...
                bX, bOrdY, bRefY, headParams, effWeights, l_ord, l_ref, cfg.weightDecay);
            
            it = (ep-1)*numBatches + b;
            [headParams.W_bn, avgGW_bn, avgSqGW_bn] = adamupdate(headParams.W_bn, gW_bn, avgGW_bn, avgSqGW_bn, it, lr);
            [headParams.b_bn, ~, ~] = adamupdate(headParams.b_bn, gB_bn, [], [], it, lr);
            [headParams.W_ord, avgGW_ord, avgSqGW_ord] = adamupdate(headParams.W_ord, gW_ord, avgGW_ord, avgSqGW_ord, it, lr);
            [headParams.b_ord, ~, ~] = adamupdate(headParams.b_ord, gB_ord, [], [], it, lr);
            [headParams.cutoffs, avgGCut, avgSqGCut] = adamupdate(headParams.cutoffs, gCut, avgGCut, avgSqGCut, it, lr);
            [headParams.W_ref, avgGW_ref, avgSqGW_ref] = adamupdate(headParams.W_ref, gW_ref, avgGW_ref, avgSqGW_ref, it, lr);
            [headParams.b_ref, ~, ~] = adamupdate(headParams.b_ref, gB_ref, [], [], it, lr);
        end
    end
end

function [loss, gW_bn, gB_bn, gW_ord, gB_ord, gCut, gW_ref, gB_ref] = lossAndGradsHead(X, ordY, refY, headParams, effWeights, l_ord, l_ref, wd)
    [cumProbs, pRef, ~] = forwardMultitask(X, headParams, true, 0.4);
    loss = totalLoss(cumProbs, ordY, pRef, refY, effWeights, l_ord, l_ref, headParams, wd);
    [gW_bn, gB_bn, gW_ord, gB_ord, gCut, gW_ref, gB_ref] = dlgradient(loss, ...
        headParams.W_bn, headParams.b_bn, headParams.W_ord, headParams.b_ord, headParams.cutoffs, headParams.W_ref, headParams.b_ref);
end

function [qwk, auroc, f1] = evalValMetrics(valFeat, valTable, headParams)
    valX = dlarray(valFeat');
    [cumProbsDl, pRefDl, ~] = forwardMultitask(valX, headParams, false, 0);
    cumProbs = double(gather(extractdata(cumProbsDl)))';
    pRef     = double(gather(extractdata(pRefDl)))';
    
    valPredGrade = sum(cumProbs >= 0.5, 2);
    valTrueGrade = valTable.DR_grade;
    qwk = computeQWK_local(valTrueGrade, valPredGrade);
    
    valRefTrue = valTrueGrade >= 2;
    [~, ~, ~, auroc] = perfcurve(valRefTrue, pRef, true);
    
    predRef = pRef >= 0.5;
    tp = sum(predRef & valRefTrue);
    fp = sum(predRef & ~valRefTrue);
    fn = sum(~predRef & valRefTrue);
    prec = tp / max(tp + fp, 1);
    rec  = tp / max(tp + fn, 1);
    f1   = 2 * prec * rec / max(prec + rec, 1e-6);
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
