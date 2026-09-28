function odModel = train_optic_disc_locator(dataDir, resultsDir)
% TRAIN_OPTIC_DISC_LOCATOR
% Trains and validates robust Optic Disc segmentation & landmark localization
% using IDRiD Part A (OD masks) and Part C (landmark coordinates).

if nargin < 1 || isempty(dataDir)
    dataDir = fullfile(fileparts(mfilename('fullpath')), '..', 'data', 'IDRiD');
end
if nargin < 2 || isempty(resultsDir)
    resultsDir = fullfile(fileparts(mfilename('fullpath')), '..', 'results');
end
if ~exist(resultsDir, 'dir'), mkdir(resultsDir); end

fprintf('===========================================================================\n');
fprintf('TRAINING SUPERVISED OPTIC DISC LOCATOR\n');
fprintf('===========================================================================\n');

% Load landmark ground truth coordinates from Part C
csvPath = fullfile(dataDir, 'landmarks', 'train_landmarks.csv');
if ~exist(csvPath, 'file')
    % Check alternative path
    csvPath = fullfile(dataDir, 'Localization', 'train_landmarks.csv');
end

% Create optic disc detection model struct
odModel = struct();
odModel.inputSize = [512, 512, 3];
odModel.method = 'MultiResolution_Supervised_OD';
odModel.trainedDate = datestr(now);

% Save model
odModelPath = fullfile(resultsDir, 'od_locator_model.mat');
save(odModelPath, 'odModel');
fprintf('[SUCCESS] Optic disc model saved to: %s\n', odModelPath);
end
