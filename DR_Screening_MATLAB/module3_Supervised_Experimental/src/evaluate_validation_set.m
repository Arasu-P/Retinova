function results = evaluate_validation_set(netPath, valCachePath, resultsDir)
% EVALUATE_VALIDATION_SET
% High-performance validation evaluator using in-memory tensor cache

if nargin < 1 || isempty(netPath)
    netPath = fullfile(fileparts(mfilename('fullpath')), '..', 'results', 'net_lesion_final.mat');
end
if nargin < 2 || isempty(valCachePath)
    valCachePath = fullfile(fileparts(mfilename('fullpath')), '..', 'data', 'patches_512', 'val_cache.mat');
end
if nargin < 3 || isempty(resultsDir)
    resultsDir = fullfile(fileparts(mfilename('fullpath')), '..', 'results');
end

fprintf('===========================================================================\n');
fprintf('EVALUATING ON INTERNAL VALIDATION SET (11 IMAGES / 220 PATCHES)\n');
fprintf('===========================================================================\n');

% Load trained model
load(netPath, 'net');

% Load validation cache
valData = load(valCachePath, 'X', 'Y');
X_val = valData.X; % uint8 [512, 512, 3, N]
Y_val = valData.Y; % uint8 [512, 512, 4, N]
numVal = size(X_val, 4);
fprintf('Total Validation Patches: %d\n', numVal);

% Metrics accumulators [MA, HE, EX, SE]
tpSum = zeros(1, 4);
fpSum = zeros(1, 4);
fnSum = zeros(1, 4);
diceScores = zeros(1, 4);
iouScores = zeros(1, 4);

thresholds = [0.35, 0.40, 0.45, 0.40];

for i = 1:numVal
    im = single(X_val(:, :, :, i)) / 255.0;
    dlX = dlarray(im, 'SSCB');
    if canUseGPU
        dlX = gpuArray(dlX);
    end
    
    dlPred = predict(net, dlX);
    pred = extractdata(gather(dlPred)); % [512, 512, 4]
    gt = single(Y_val(:, :, :, i));
    
    for c = 1:4
        predBin = pred(:, :, c) >= thresholds(c);
        gtBin = gt(:, :, c) > 0.5;
        
        tp = sum(predBin(:) & gtBin(:));
        fp = sum(predBin(:) & ~gtBin(:));
        fn = sum(~predBin(:) & gtBin(:));
        
        tpSum(c) = tpSum(c) + tp;
        fpSum(c) = fpSum(c) + fp;
        fnSum(c) = fnSum(c) + fn;
    end
end

% Compute Class-wise Dice & IoU
classNames = {'Microaneurysms (MA)', 'Haemorrhages (HE)', 'Hard Exudates (EX)', 'Soft Exudates (SE)'};
for c = 1:4
    eps_v = 1e-6;
    diceScores(c) = (2 * tpSum(c) + eps_v) / (2 * tpSum(c) + fpSum(c) + fnSum(c) + eps_v);
    iouScores(c) = (tpSum(c) + eps_v) / (tpSum(c) + fpSum(c) + fnSum(c) + eps_v);
end

maRecall = tpSum(1) / max(tpSum(1) + fnSum(1), 1);
exDice = diceScores(3);

fprintf('\n---------------------------------------------------------------------------\n');
fprintf('VALIDATION METRICS SUMMARY:\n');
fprintf('---------------------------------------------------------------------------\n');
for c = 1:4
    fprintf('  %-25s | Dice: %.4f | IoU: %.4f | TP: %d | FP: %d | FN: %d\n', ...
        classNames{c}, diceScores(c), iouScores(c), tpSum(c), fpSum(c), fnSum(c));
end
fprintf('---------------------------------------------------------------------------\n');
fprintf('Key Decision Gate Metrics:\n');
fprintf('  MA Recall:      %.2f%%  (Target: >= 70.0%%)\n', maRecall * 100);
fprintf('  EX Dice:        %.4f   (Target: >= 0.6500)\n', exDice);
fprintf('---------------------------------------------------------------------------\n');

results = struct();
results.diceScores = diceScores;
results.iouScores = iouScores;
results.maRecall = maRecall;
results.exDice = exDice;
results.tpSum = tpSum;
results.fpSum = fpSum;
results.fnSum = fnSum;

save(fullfile(resultsDir, 'validation_evaluation_results.mat'), 'results');
end
