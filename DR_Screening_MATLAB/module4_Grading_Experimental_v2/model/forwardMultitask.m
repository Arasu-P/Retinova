function [cumProbs, pRef, h_bottleneck] = forwardMultitask(features, headParams, isTraining, dropoutRate)
% FORWARDMULTITASK - Computes forward pass through shared bottleneck, Ordinal Head, and Referable Head.
%
% Inputs:
%   features     - 2048 x B feature matrix from ResNet-50 avg_pool
%   headParams   - Struct of weights and cutoffs
%   isTraining   - Boolean flag (true applies dropout)
%   dropoutRate  - Dropout probability (default 0.4)

if nargin < 3
    isTraining = false;
end
if nargin < 4
    dropoutRate = 0.40;
end

% 1. Shared Bottleneck: FC 2048 -> 512
z_bn = headParams.W_bn * features + headParams.b_bn; % 512 x B

% BatchNorm approximation (instance standardization across channel)
mu = mean(z_bn, 1);
sigma = std(z_bn, 0, 1) + single(1e-5);
z_norm = (z_bn - mu) ./ sigma;
z_bn_scaled = headParams.bn_gamma .* z_norm + headParams.bn_beta;

% ReLU
h_bottleneck = relu(z_bn_scaled);

% Dropout
if isTraining && dropoutRate > 0
    mask = rand(size(h_bottleneck), 'like', h_bottleneck) > single(dropoutRate);
    h_bottleneck = (h_bottleneck .* mask) / single(1.0 - dropoutRate);
end

% 2. Ordinal Head: FC 512 -> 1 scalar severity s(x)
s = headParams.W_ord * h_bottleneck + headParams.b_ord; % 1 x B

cut = headParams.cutoffs;
theta1 = cut(1);
theta2 = theta1 + exp(cut(2));
theta3 = theta2 + exp(cut(3));
theta4 = theta3 + exp(cut(4));
theta  = [theta1; theta2; theta3; theta4]; % 4 x 1

z_ord = s - theta; % 4 x B
cumProbs = sigmoid(z_ord); % 4 x B

% 3. Referable Head: FC 512 -> 1 logit z_ref(x)
z_ref = headParams.W_ref * h_bottleneck + headParams.b_ref; % 1 x B
pRef = sigmoid(z_ref); % 1 x B

end
