function [optThresh, sweepTable] = thresholdSweep(valScores, valTargets, minSpec)
% THRESHOLDSWEEP - Sweeps referable thresholds on validation set to maximize sensitivity
% subject to specificity >= minSpec (default 0.65).

if nargin < 3
    minSpec = 0.65;
end

valScores   = double(valScores(:));
valTargets  = double(valTargets(:) >= 1);

thresholds = 0.01 : 0.01 : 0.99;
numT = length(thresholds);

sens = zeros(numT, 1);
spec = zeros(numT, 1);
prec = zeros(numT, 1);
f1   = zeros(numT, 1);
acc  = zeros(numT, 1);

for i = 1:numT
    th = thresholds(i);
    pred = valScores >= th;
    
    tp = sum(pred & valTargets);
    tn = sum(~pred & ~valTargets);
    fp = sum(pred & ~valTargets);
    fn = sum(~pred & valTargets);
    
    sens(i) = tp / max(tp + fn, 1);
    spec(i) = tn / max(tn + fp, 1);
    prec(i) = tp / max(tp + fp, 1);
    f1(i)   = 2 * prec(i) * sens(i) / max(prec(i) + sens(i), 1e-6);
    acc(i)  = (tp + tn) / length(valTargets);
end

[~, ~, ~, auroc] = perfcurve(valTargets, valScores, true);

% Constrained selection: Maximize sensitivity subject to specificity >= minSpec
validIndices = find(spec >= minSpec);
if isempty(validIndices)
    % Fallback to maximum Youden Index
    [~, bestIdx] = max(sens + spec - 1);
else
    % Maximize sensitivity among valid indices (and break ties with F1)
    [~, maxSensSubIdx] = max(sens(validIndices) + 0.01 * f1(validIndices));
    bestIdx = validIndices(maxSensSubIdx);
end

optThresh = thresholds(bestIdx);

fprintf('Referable Threshold Optimization (Validation Set):\n');
fprintf('  Selected Threshold   : %.2f\n', optThresh);
fprintf('  Validation Sensitivity: %5.2f%%\n', 100 * sens(bestIdx));
fprintf('  Validation Specificity: %5.2f%% (Constraint: >= %.2f%%)\n', 100 * spec(bestIdx), 100 * minSpec);
fprintf('  Validation F1-Score   : %5.2f%%\n', 100 * f1(bestIdx));
fprintf('  Validation AUROC      : %6.4f\n\n', auroc);

sweepTable = table(thresholds', sens, spec, prec, f1, acc, ...
    'VariableNames', {'Threshold', 'Sensitivity', 'Specificity', 'Precision', 'F1', 'Accuracy'});

end
