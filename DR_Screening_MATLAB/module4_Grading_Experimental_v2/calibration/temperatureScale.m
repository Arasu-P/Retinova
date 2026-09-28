function [learnedTemp, calibProbs] = temperatureScale(valLogits, valTargets)
% TEMPERATURESCALE - Fits optimal temperature T > 0 on validation set using NLL minimization.

valLogits  = double(valLogits);
valTargets = double(valTargets);

% Objective: Negative Log-Likelihood with temperature T
nllLoss = @(logT) computeNLL(valLogits, valTargets, exp(logT));

% Optimize log(T) starting at log(1.0) = 0
optLogT = fminsearch(nllLoss, 0.0);
learnedTemp = exp(optLogT);

% Bound temperature sensibly in [0.5, 3.0]
learnedTemp = max(min(learnedTemp, 3.0), 0.5);

fprintf('Learned Optimal Temperature (Validation): T = %.4f\n', learnedTemp);
calibProbs = 1.0 ./ (1.0 + exp(-valLogits / learnedTemp));

end

function nll = computeNLL(logits, targets, T)
    scaled = logits / max(T, 1e-3);
    p = 1.0 ./ (1.0 + exp(-scaled));
    eps_val = 1e-7;
    p = max(min(p, 1.0 - eps_val), eps_val);
    nll = - mean(targets .* log(p) + (1.0 - targets) .* log(1.0 - p));
end
