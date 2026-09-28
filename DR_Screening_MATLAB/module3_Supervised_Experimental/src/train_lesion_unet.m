function [net, history] = train_lesion_unet(dataDir, resultsDir, options)
% TRAIN_LESION_UNET
% Ultra-fast RAM-cached GPU training loop for 4-channel Lesion U-Net

if nargin < 1 || isempty(dataDir)
    dataDir = fullfile(fileparts(mfilename('fullpath')), '..', 'data', 'patches_512');
end
if nargin < 2 || isempty(resultsDir)
    resultsDir = fullfile(fileparts(mfilename('fullpath')), '..', 'results');
end
if ~exist(resultsDir, 'dir'), mkdir(resultsDir); end

if nargin < 3, options = struct(); end
if ~isfield(options, 'numEpochs'), options.numEpochs = 25; end
if ~isfield(options, 'batchSize'), options.batchSize = 4; end
if ~isfield(options, 'initialLearnRate'), options.initialLearnRate = 3e-4; end
if ~isfield(options, 'minLearnRate'), options.minLearnRate = 1e-6; end

fprintf('===========================================================================\n');
fprintf('TRAINING SUPERVISED 4-CHANNEL LESION U-NET (RAM-CACHED GPU ACCELERATION)\n');
fprintf('===========================================================================\n');
fprintf('Epochs: %d | Batch Size: %d | Initial LR: %.1e\n', ...
    options.numEpochs, options.batchSize, options.initialLearnRate);

% Build Model
inputSize = [512 512 3];
numClasses = 4;
net = build_lesion_unet(inputSize, numClasses);

% Load pre-packed training cache into memory
cachePath = fullfile(dataDir, 'train_cache.mat');
if ~exist(cachePath, 'file')
    error('Training cache not found at: %s', cachePath);
end

fprintf('Loading dataset cache into RAM: %s...\n', cachePath);
t_load = tic;
data = load(cachePath, 'X', 'Y');
X_all = data.X; % uint8 [512, 512, 3, N]
Y_all = data.Y; % uint8 [512, 512, 4, N]
numTrain = size(X_all, 4);
fprintf('Loaded %d patches into RAM in %.2fs!\n', numTrain, toc(t_load));

% Optimizer state
averageGrad = [];
averageSqGrad = [];

history = struct();
history.trainLoss = zeros(1, options.numEpochs);
history.lr = zeros(1, options.numEpochs);
history.epochTimes = zeros(1, options.numEpochs);

numBatches = floor(numTrain / options.batchSize);

for epoch = 1:options.numEpochs
    t_epoch = tic;
    
    % Cosine Annealing Learning Rate
    lr = options.minLearnRate + 0.5 * (options.initialLearnRate - options.minLearnRate) * ...
        (1 + cos(pi * (epoch - 1) / options.numEpochs));
    history.lr(epoch) = lr;
    
    % Shuffle training indices
    shuffledIdx = randperm(numTrain);
    epochLossSum = 0;
    
    for b = 1:numBatches
        batchIndices = shuffledIdx((b-1)*options.batchSize + 1 : b*options.batchSize);
        
        % Fast memory slice & single precision normalization
        X_batch = single(X_all(:, :, :, batchIndices)) / 255.0;
        Y_batch = single(Y_all(:, :, :, batchIndices));
        
        % Fast Batch Data Augmentation
        if rand > 0.5
            X_batch = flip(X_batch, 2);
            Y_batch = flip(Y_batch, 2);
        end
        if rand > 0.5
            X_batch = flip(X_batch, 1);
            Y_batch = flip(Y_batch, 1);
        end
        
        % Transfer batch to GPU
        dlX = dlarray(X_batch, 'SSCB');
        dlY = dlarray(Y_batch, 'SSCB');
        
        if canUseGPU
            dlX = gpuArray(dlX);
            dlY = gpuArray(dlY);
        end
        
        % Forward pass and loss evaluation
        [loss, gradients] = dlfeval(@focal_tversky_dice_loss, net, dlX, dlY);
        
        % Adam parameter update
        iteration = (epoch - 1) * numBatches + b;
        [net, averageGrad, averageSqGrad] = adamupdate(net, gradients, ...
            averageGrad, averageSqGrad, iteration, lr);
        
        loss_val = double(gather(extractdata(loss)));
        epochLossSum = epochLossSum + loss_val;
    end
    
    avgTrainLoss = epochLossSum / numBatches;
    history.trainLoss(epoch) = avgTrainLoss;
    history.epochTimes(epoch) = toc(t_epoch);
    
    fprintf('Epoch %02d/%02d - Train Loss: %.6f | LR: %.2e | Time: %.1fs\n', ...
        epoch, options.numEpochs, avgTrainLoss, lr, history.epochTimes(epoch));
    
    % Save checkpoint every 10 epochs
    if mod(epoch, 10) == 0 || epoch == options.numEpochs
        ckptPath = fullfile(resultsDir, sprintf('net_lesion_epoch_%02d.mat', epoch));
        save(ckptPath, 'net', 'history', '-v7.3');
    end
end

% Save final trained model
finalModelPath = fullfile(resultsDir, 'net_lesion_final.mat');
save(finalModelPath, 'net', 'history', '-v7.3');
fprintf('\n[SUCCESS] Lesion U-Net model saved to: %s\n', finalModelPath);
end
