function [probMaps, binaryMasks] = predict_lesion_tiled(net, img, patchSize, stride, thresholds)
% PREDICT_LESION_TILED
% Performs high-resolution sliding-window inference with 2D Gaussian apodization
% weighting to eliminate boundary seam artifacts.
%
% Inputs:
%   net        - Trained 4-channel dlnetwork
%   img        - Input RGB fundus image (uint8 or single in [0, 1])
%   patchSize  - Size of square patch [default: 512]
%   stride     - Step size between patches [default: 256 for 50% overlap]
%   thresholds - 1x4 vector of per-class binarization thresholds [default: [0.35, 0.40, 0.45, 0.40]]
%
% Outputs:
%   probMaps    - [H, W, 4] single array of continuous lesion probabilities [MA, HE, EX, SE]
%   binaryMasks - [H, W, 4] logical array of thresholded lesion detections

if nargin < 3 || isempty(patchSize), patchSize = 512; end
if nargin < 4 || isempty(stride), stride = 256; end
if nargin < 5 || isempty(thresholds), thresholds = [0.35, 0.40, 0.45, 0.40]; end

if isa(img, 'uint8')
    img = single(img) / 255.0;
else
    img = single(img);
end

[H, W, ~] = size(img);

% Pad image to fit integer number of patches
padH = 0;
padW = 0;
if mod(H - patchSize, stride) ~= 0
    padH = stride - mod(H - patchSize, stride);
end
if mod(W - patchSize, stride) ~= 0
    padW = stride - mod(W - patchSize, stride);
end

imgPadded = padarray(img, [padH, padW, 0], 'replicate', 'post');
[Hpad, Wpad, ~] = size(imgPadded);

% Generate 2D Gaussian window for smooth blending
[Xg, Yg] = meshgrid(linspace(-2, 2, patchSize), linspace(-2, 2, patchSize));
gaussWeight = exp(-(Xg.^2 + Yg.^2) / 2);
gaussWeight = single(gaussWeight / max(gaussWeight(:)));

% Accumulators
accumProb = zeros(Hpad, Wpad, 4, 'single');
accumWeight = zeros(Hpad, Wpad, 'single');

% Tile coordinates
ySteps = 1:stride:(Hpad - patchSize + 1);
xSteps = 1:stride:(Wpad - patchSize + 1);

for y = ySteps
    for x = xSteps
        patch = imgPadded(y:y+patchSize-1, x:x+patchSize-1, :);
        dlPatch = dlarray(patch, 'SSCB');
        if canUseGPU
            dlPatch = gpuArray(dlPatch);
        end
        
        dlPred = predict(net, dlPatch);
        predPatch = extractdata(gather(dlPred)); % [512, 512, 4]
        
        for c = 1:4
            accumProb(y:y+patchSize-1, x:x+patchSize-1, c) = ...
                accumProb(y:y+patchSize-1, x:x+patchSize-1, c) + predPatch(:, :, c) .* gaussWeight;
        end
        accumWeight(y:y+patchSize-1, x:x+patchSize-1) = ...
            accumWeight(y:y+patchSize-1, x:x+patchSize-1) + gaussWeight;
    end
end

% Normalize accumulated probabilities by weight map
for c = 1:4
    accumProb(:, :, c) = accumProb(:, :, c) ./ max(accumWeight, 1e-6);
end

% Crop back to original dimensions
probMaps = accumProb(1:H, 1:W, :);

% Thresholding for binary masks
binaryMasks = false(H, W, 4);
for c = 1:4
    binaryMasks(:, :, c) = probMaps(:, :, c) >= thresholds(c);
end

end
