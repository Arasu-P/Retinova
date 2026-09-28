function result = run_GradCAM_ResNetOrdinal_Experimental(imageInput)
% RUN_GRADCAM_RESNETORDINAL_EXPERIMENTAL
% ============================================================
% EXPERIMENTAL GRAD-CAM FOR RESNET-50 ORDINAL DR MODEL
%
% Visualizes high-gradient evidence regions corresponding to
% predicted DR severity.
% Feature Layer: 'activation_49_relu' (last conv activation in ResNet-50)
% ============================================================

if nargin < 1
    error('run_GradCAM_ResNetOrdinal_Experimental requires an imageInput.');
end

projectRoot = 'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB';
modelPath = fullfile(projectRoot, 'results', 'Experimental_ResNet50_Ordinal', 'ResNet50_Ordinal_DR_Model.mat');

if ~isfile(modelPath)
    error('Trained model not found at: %s', modelPath);
end

M = load(modelPath);
headParams = M.headParams;
inputSize = M.inputSize;

% Pretrained ResNet-50 lgraph for Grad-CAM
net = resnet50;
lgraph = layerGraph(net);
lgraph = removeLayers(lgraph, {'fc1000', 'fc1000_softmax', 'ClassificationLayer_fc1000'});
featureLayer = 'activation_49_relu'; % Last residual block ReLU

dlnet = dlnetwork(lgraph);

if ischar(imageInput) || isstring(imageInput)
    origImg = imread(imageInput);
else
    origImg = imageInput;
end

if size(origImg, 3) == 1
    origImg = repmat(origImg, [1 1 3]);
end

imgResized = imresize(origImg, inputSize(1:2));
imgSingle  = single(imgResized);

useGPU = false;
try
    useGPU = gpuDeviceCount > 0;
catch
    useGPU = false;
end

inputDl = dlarray(imgSingle, 'SSCB');
if useGPU
    inputDl = gpuArray(inputDl);
end

% Forward and Gradient evaluation
[act, grad] = dlfeval(@computeFeatureGradients, dlnet, inputDl, featureLayer, headParams);

actMat  = extractdata(gather(act));   % H x W x C
gradMat = extractdata(gather(grad));  % H x W x C

% Global average pooling of gradients
alpha = mean(mean(gradMat, 1), 2); % 1 x 1 x C

% Weighted combination of activation maps
cam = sum(alpha .* actMat, 3);

% ReLU and normalization
cam = max(cam, 0);
if max(cam(:)) > 0
    cam = cam / max(cam(:));
end

% Resize to original image size
camResized = imresize(cam, [size(origImg, 1), size(origImg, 2)]);

% Create colormap overlay
cmap = jet(256);
heatmapRGB = ind2rgb(round(camResized * 255) + 1, cmap);

alphaBlend = 0.5;
origDouble = im2double(origImg);
overlay = (1 - alphaBlend) * origDouble + alphaBlend * heatmapRGB;

% Compute predicted grade and confidence
gradingResult = run_Grading_ResNetOrdinal_Experimental(imageInput);

result = struct();
result.heatmap = camResized;
result.heatmapRGB = heatmapRGB;
result.overlay = overlay;
result.predictedGrade = gradingResult.predictedGrade;
result.confidence = gradingResult.gradingConfidence;
result.featureLayer = featureLayer;
result.executionEnvironment = gradingResult.executionEnvironment;
result.status = "SUCCESS";

end

function [act, grad] = computeFeatureGradients(dlnet, inputDl, featureLayer, headParams)
    act = forward(dlnet, inputDl, 'Outputs', featureLayer);
    % ResNet avg_pool on act
    gap = mean(mean(act, 1), 2); % 1 x 1 x 2048
    gapVec = reshape(gap, [2048, 1]);
    
    W = headParams.W; % 1 x 2048
    b0 = headParams.b0;
    
    % Severity score
    s = W * gapVec + b0;
    
    grad = dlgradient(s, act);
end
