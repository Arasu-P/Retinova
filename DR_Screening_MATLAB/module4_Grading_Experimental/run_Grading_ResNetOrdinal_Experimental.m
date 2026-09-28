function result = run_Grading_ResNetOrdinal_Experimental(imageInput)
% RUN_GRADING_RESNETORDINAL_EXPERIMENTAL
% ============================================================
% EXPERIMENTAL MODULE 4 - RESNET-50 ORDINAL DR GRADING
%
% Input:
%   imageInput - file path (string/char) or RGB image matrix
%
% Output:
%   result - structure containing:
%       predictedGrade          - 0, 1, 2, 3, or 4
%       continuousSeverityScore - continuous score in [0, 4]
%       ordinalProbabilities    - [P(Y>=1), P(Y>=2), P(Y>=3), P(Y>=4)]
%       classProbabilities      - [P(G=0), P(G=1), P(G=2), P(G=3), P(G=4)]
%       gradingConfidence       - max class probability
%       binaryDRPrediction      - "No DR" or "DR"
%       referablePrediction     - "Non-Referable" or "Referable"
%       referableScore          - P(Y>=2)
%       executionEnvironment    - "GPU" or "CPU"
%       modelPath               - Path to trained .mat model
%       status                  - "SUCCESS"
% ============================================================

if nargin < 1
    error('run_Grading_ResNetOrdinal_Experimental requires an imageInput.');
end

projectRoot = 'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB';
modelPath = fullfile(projectRoot, 'results', 'Experimental_ResNet50_Ordinal', 'ResNet50_Ordinal_DR_Model.mat');

if ~isfile(modelPath)
    error('Trained ResNet-50 Ordinal model not found at:\n%s', modelPath);
end

% Load trained model
M = load(modelPath);
featureExtractor = M.featureExtractor;
headParams = M.headParams;
inputSize = M.inputSize;
frozenRefThresh = M.frozenReferableThreshold;

% Load/prepare image
if ischar(imageInput) || isstring(imageInput)
    if ~isfile(imageInput)
        error('Input image file does not exist: %s', imageInput);
    end
    img = imread(imageInput);
else
    img = imageInput;
end

if size(img, 3) == 1
    img = repmat(img, [1 1 3]);
end

imgResized = imresize(img, inputSize(1:2));
imgSingle  = single(imgResized);

% GPU / CPU execution
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

% Extract features
featDl = forward(featureExtractor, inputDl, 'Outputs', 'avg_pool');
featMat = squeeze(extractdata(gather(featDl))); % 2048 x 1

% Forward through ordinal head
W = extractdata(headParams.W);
b0 = extractdata(headParams.b0);
cut = extractdata(headParams.cutoffs);

s = double(W * featMat + b0);

theta1 = double(cut(1));
theta2 = theta1 + exp(double(cut(2)));
theta3 = theta2 + exp(double(cut(3)));
theta4 = theta3 + exp(double(cut(4)));

theta = [theta1; theta2; theta3; theta4];
z = s - theta;
cumProbs = 1 ./ (1 + exp(-z)); % 4 x 1: [P(>=1), P(>=2), P(>=3), P(>=4)]

P_ge_1 = cumProbs(1);
P_ge_2 = cumProbs(2);
P_ge_3 = cumProbs(3);
P_ge_4 = cumProbs(4);

continuousSeverityScore = P_ge_1 + P_ge_2 + P_ge_3 + P_ge_4;
predictedGrade = sum(cumProbs >= 0.5);

P_G0 = 1 - P_ge_1;
P_G1 = P_ge_1 - P_ge_2;
P_G2 = P_ge_2 - P_ge_3;
P_G3 = P_ge_3 - P_ge_4;
P_G4 = P_ge_4;

classProbabilities = [P_G0, P_G1, P_G2, P_G3, P_G4];
gradingConfidence = max(classProbabilities);

if predictedGrade >= 1
    binaryDRPrediction = "DR";
else
    binaryDRPrediction = "No DR";
end

referableScore = P_ge_2;
if referableScore >= frozenRefThresh
    referablePrediction = "Referable";
else
    referablePrediction = "Non-Referable";
end

if useGPU
    executionEnv = "GPU";
else
    executionEnv = "CPU";
end

% Output struct
result = struct();
result.predictedGrade = predictedGrade;
result.continuousSeverityScore = continuousSeverityScore;
result.ordinalProbabilities = cumProbs';
result.classProbabilities = classProbabilities;
result.gradingConfidence = gradingConfidence;
result.binaryDRPrediction = binaryDRPrediction;
result.referablePrediction = referablePrediction;
result.referableScore = referableScore;
result.referableThreshold = frozenRefThresh;
result.executionEnvironment = executionEnv;
result.modelPath = modelPath;
result.status = "SUCCESS";

end
