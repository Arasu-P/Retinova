function loss = ordinalLossWeighted(cumProbs, targets, effWeights)
% ORDINALLOSSWEIGHTED - Computes cumulative binary cross-entropy with effective-number weights.
%
% Inputs:
%   cumProbs   - 4 x B matrix of P(Y >= 1..4)
%   targets    - 4 x B matrix of binary cumulative targets in {0, 1}
%   effWeights - 4 x 1 vector of normalized effective-number weights

eps_val = single(1e-7);
w = dlarray(single(effWeights(:))); % 4 x 1

bce = - (targets .* log(cumProbs + eps_val) + (1.0 - targets) .* log(1.0 - cumProbs + eps_val));
weightedBCE = w .* bce; % 4 x B

loss = mean(sum(weightedBCE, 1));

end
