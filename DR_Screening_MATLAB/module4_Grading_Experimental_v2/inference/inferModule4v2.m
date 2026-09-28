function result = inferModule4v2(imageInput)
% INFERMODULE4V2 - Complete Standalone Inference for Module 4 v2.
%
% Input:
%   imageInput - image matrix or path to fundus image
%
% Output:
%   result structure with predictedGrade, classProbabilities, cumulativeProbabilities,
%   referableProbability, referableDecision, confidence, severityScore, calibrationOutput,
%   featureLayerName, gradCAMLayerInfo, metadata.

cfg = config();
modelSavePath = fullfile(cfg.resultsDir, 'Module4v2_Model.mat');

if ~isfile(modelSavePath)
    error('Module 4 v2 trained model not found at: %s', modelSavePath);
end

M = load(modelSavePath);
backboneNet = M.backboneNet;
headParams  = M.headParams;
learnedTemp = M.learnedTemp;
optRefThresh = M.optRefThresh;
featureLayerName = M.featureLayerName;

if ischar(imageInput) || isstring(imageInput)
    if ~isfile(imageInput)
        error('Input image file not found: %s', imageInput);
    end
    rawImg = imread(imageInput);
else
    rawImg = imageInput;
end

% Preprocessing
procImg = preprocessPipeline(rawImg, cfg.inputSize);

useGPU = false;
try
    useGPU = gpuDeviceCount > 0;
catch
    useGPU = false;
end

inputDl = dlarray(procImg, 'SSCB');
if useGPU
    inputDl = gpuArray(inputDl);
end

% Extract backbone feature
featDl = forward(backboneNet, inputDl, 'Outputs', 'avg_pool');
featMat = squeeze(extractdata(gather(featDl))); % 2048 x 1

% Forward multitask head
[cumProbsDl, pRefDl, ~] = forwardMultitask(dlarray(featMat), headParams, false, 0);

cumProbs = double(gather(extractdata(cumProbsDl))); % 4 x 1
pRefRaw  = double(gather(extractdata(pRefDl)));     % 1 x 1

% Temperature scaling
refLogit = log(max(pRefRaw, 1e-7) / max(1.0 - pRefRaw, 1e-7));
pRefCalib = 1.0 / (1.0 + exp(-refLogit / learnedTemp));

[classProbs, predGrade, sevScore, ordProbs] = ordinalUtils(cumProbs);

confidence = max(classProbs);
if pRefCalib >= optRefThresh
    refDecision = "Referable";
else
    refDecision = "Non-Referable";
end

result = struct();
result.predictedGrade          = predGrade;
result.classProbabilities      = classProbs(:)';
result.cumulativeProbabilities = ordProbs(:)';
result.referableProbability    = pRefCalib;
result.referableDecision       = refDecision;
result.confidence              = confidence;
result.severityScore           = sevScore;
result.calibrationOutput       = struct('rawRefProb', pRefRaw, 'calibratedRefProb', pRefCalib, 'temperature', learnedTemp);
result.featureLayerName        = featureLayerName;
result.gradCAMLayerInfo        = struct('layerName', featureLayerName, 'featureDim', cfg.featureDim);
result.executionEnvironment    = "GPU";
result.modelPath               = modelSavePath;
result.status                  = "SUCCESS";

end
