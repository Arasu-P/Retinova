function [net, losses] = train_lesion_sanity(net, X_raw, Y_raw, numEpochs, lr)
% TRAIN_LESION_SANITY
% Performs sanity check gradient descent loop on small batch of patches

if nargin < 4, numEpochs = 5; end
if nargin < 5, lr = 0.001; end

if ~isa(X_raw, 'dlarray')
    X = dlarray(single(X_raw), 'SSCB');
else
    X = X_raw;
end

if ~isa(Y_raw, 'dlarray')
    Y = dlarray(single(Y_raw), 'SSCB');
else
    Y = Y_raw;
end

if canUseGPU
    X = gpuArray(X);
    Y = gpuArray(Y);
end

averageGrad = [];
averageSqGrad = [];
losses = zeros(1, numEpochs);

fprintf('[MATLAB] Starting %d-Epoch Sanity Training...\n', numEpochs);
for epoch = 1:numEpochs
    t_ep = tic;
    [loss, gradients] = dlfeval(@focal_tversky_dice_loss, net, X, Y);
    [net, averageGrad, averageSqGrad] = adamupdate(net, gradients, ...
        averageGrad, averageSqGrad, epoch, lr);
    
    loss_val = double(gather(extractdata(loss)));
    losses(epoch) = loss_val;
    ep_time = toc(t_ep);
    fprintf('  Epoch %d/%d - Compound Loss: %.6f (%.2f s)\n', epoch, numEpochs, loss_val, ep_time);
end
end
