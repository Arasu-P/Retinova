function result = run_Grading(img)
% run_Grading
% ============================================================
% MODULE 4 - DIABETIC RETINOPATHY GRADING
%
% Input:
%   img - enhanced RGB fundus image
%
% Output:
%   result - grading result structure
%
% Classes:
%   Grade 0 - No DR
%   Grade 1 - Mild
%   Grade 2 - Moderate
%   Grade 3 - Severe
%   Grade 4 - Proliferative DR
% ============================================================

%% Validate input

if nargin < 1
    error('run_Grading requires an input image.');
end

%% Locate model

projectRoot = ...
    'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB';

modelPath = fullfile( ...
    projectRoot, ...
    'results', ...
    'APTOS_Grading', ...
    'MobileNetV2_DR_Model.mat');

if ~isfile(modelPath)
    error('DR grading model not found: %s',modelPath);
end

%% Load trained model

S = load(modelPath);
trainedNet = S.trainedNet;
classNames = S.classNames;
inputSize = S.inputSize;

%% Prepare image

if size(img,3) == 1
    img = repmat(img,[1 1 3]);
end

if size(img,3) ~= 3
    error('Input image must be grayscale or RGB.');
end

img = im2uint8(img);

% Resize to network input size
inputImage = imresize(img,inputSize(1:2));

%% GPU inference if available

useGPU = false;

try
    useGPU = gpuDeviceCount > 0;
catch
    useGPU = false;
end

%% Classification

if useGPU

    try

        inputImageGPU = gpuArray(inputImage);

        [predictedLabel, scores] = ...
            classify(trainedNet,inputImageGPU);

        scores = gather(scores);

    catch

        % Fall back to CPU if GPU inference fails
        [predictedLabel, scores] = ...
            classify(trainedNet,inputImage);

    end

else

    [predictedLabel, scores] = ...
        classify(trainedNet,inputImage);

end

%% Convert scores to row vector

scores = double(scores(:))';

%% Determine predicted class

[confidence,idx] = max(scores);

predictedClass = string(predictedLabel);

%% Convert class names to strings

classNamesString = string(classNames);

%% Find predicted index from class names

predictedIndex = find( ...
    classNamesString == predictedClass,1);

if isempty(predictedIndex)

    predictedIndex = idx;

end

%% Extract grade number

gradeText = extractAfter(predictedClass,"Grade");

gradeNumber = str2double(gradeText);

if isnan(gradeNumber)

    gradeNumber = predictedIndex - 1;

end

%% ------------------------------------------------------------
% Result structure
% ------------------------------------------------------------

result = struct();

result.predictedClass = predictedClass;
result.grade = gradeNumber;

result.confidence = confidence;

result.classNames = classNamesString;
result.classProbabilities = scores;

result.inputSize = inputSize;

result.modelPath = modelPath;

result.status = "SUCCESS";

%% ------------------------------------------------------------
% Console output
% ------------------------------------------------------------

fprintf('\n');
fprintf('============================================================\n');
fprintf('MODULE 4 - DIABETIC RETINOPATHY GRADING\n');
fprintf('============================================================\n');

fprintf('Predicted Class     : %s\n',predictedClass);

fprintf('DR Grade            : %d\n',gradeNumber);

fprintf('Confidence          : %.2f%%\n', ...
    100*confidence);

fprintf('------------------------------------------------------------\n');

for k = 1:numel(classNamesString)

    fprintf('%-20s : %6.2f%%\n', ...
        char(classNamesString(k)), ...
        100*scores(k));

end

fprintf('------------------------------------------------------------\n');
fprintf('Status              : SUCCESS\n');
fprintf('============================================================\n');

end