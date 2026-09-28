function result = gradCAMHook(imageInput)
% GRADCAMHOOK - Multitask Grad-CAM Explainability for Module 4 v2.
% Dynamically hooks into the last convolutional feature layer of ResNet-50.

cfg = config();
modelSavePath = fullfile(cfg.resultsDir, 'Module4v2_Model.mat');

if ~isfile(modelSavePath)
    error('Module 4 v2 model not found at: %s', modelSavePath);
end

M = load(modelSavePath);
headParams = M.headParams;
featureLayerName = M.featureLayerName;

if ischar(imageInput) || isstring(imageInput)
    origImg = imread(imageInput);
else
    origImg = imageInput;
end

procImg = preprocessPipeline(origImg, cfg.inputSize);

net = resnet50;
lgraph = layerGraph(net);
lgraph = removeLayers(lgraph, {'fc1000', 'fc1000_softmax', 'ClassificationLayer_fc1000'});
dlnet = dlnetwork(lgraph);

inputDl = dlarray(procImg, 'SSCB');
if gpuDeviceCount > 0
    inputDl = gpuArray(inputDl);
end

[act, grad] = dlfeval(@computeFeatureGradients, dlnet, inputDl, featureLayerName, headParams);

actMat  = extractdata(gather(act));   % H x W x C
gradMat = extractdata(gather(grad));  % H x W x C

alpha = mean(mean(gradMat, 1), 2);
cam = sum(alpha .* actMat, 3);
cam = max(cam, 0);
if max(cam(:)) > 0
    cam = cam / max(cam(:));
end

camResized = imresize(cam, [size(origImg, 1), size(origImg, 2)]);
cmap = jet(256);
heatmapRGB = ind2rgb(round(camResized * 255) + 1, cmap);

alphaBlend = 0.5;
origD = im2double(origImg);
overlay = (1 - alphaBlend) * origD + alphaBlend * heatmapRGB;

inferRes = inferModule4v2(imageInput);

result = struct();
result.originalImage   = origImg;
result.heatmap         = camResized;
result.heatmapRGB      = heatmapRGB;
result.overlay         = overlay;
result.predictedGrade  = inferRes.predictedGrade;
result.confidence      = inferRes.confidence;
result.featureLayer    = featureLayerName;
result.status          = "SUCCESS";

end

function [act, grad] = computeFeatureGradients(dlnet, inputDl, featureLayerName, headParams)
    act = forward(dlnet, inputDl, 'Outputs', featureLayerName);
    gap = mean(mean(act, 1), 2);
    f = reshape(gap, [2048, 1]);
    
    [cumProbs, pRef, ~] = forwardMultitask(f, headParams, false, 0);
    sev = sum(cumProbs, 1) + pRef;
    
    grad = dlgradient(sev, act);
end
