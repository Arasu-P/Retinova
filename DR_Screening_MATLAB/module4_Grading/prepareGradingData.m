clc;
clear;
close all;

fprintf('====================================================\n');
fprintf('        MODULE 4 - GRADING DATA PREPARATION\n');
fprintf('====================================================\n\n');

%% ----------------------------------------------------
% PROJECT PATHS
% -----------------------------------------------------

projectFolder = ...
    "C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB";

segFile = fullfile( ...
    projectFolder, ...
    "results", ...
    "APTOS_Segmentation", ...
    "APTOS_Segmentation_Features.csv");

qualityFile = fullfile( ...
    projectFolder, ...
    "results", ...
    "APTOS_Quality_Scored.csv");

imageFolder = fullfile( ...
    projectFolder, ...
    "results", ...
    "APTOS_Enhanced", ...
    "images");

outputFolder = fullfile( ...
    projectFolder, ...
    "results", ...
    "APTOS_Grading");

if ~isfolder(outputFolder)
    mkdir(outputFolder);
end

%% ----------------------------------------------------
% LOAD DATA
% -----------------------------------------------------

S = readtable(segFile);
Q = readtable(qualityFile);

fprintf('Segmentation records : %d\n', height(S));
fprintf('Quality records      : %d\n', height(Q));

%% ----------------------------------------------------
% KEEP SUCCESSFUL SEGMENTATIONS
% -----------------------------------------------------

validRows = string(S.status) == "SUCCESS";

S = S(validRows,:);

fprintf('Successful records   : %d\n', height(S));

%% ----------------------------------------------------
% IMAGE IDENTIFIERS
% -----------------------------------------------------

imageNames = string(S.imageName);

% Remove original extension
imageIDs = erase(imageNames,".png");
imageIDs = erase(imageIDs,".jpg");
imageIDs = erase(imageIDs,".jpeg");

%% ----------------------------------------------------
% CREATE ENHANCED IMAGE NAMES
% -----------------------------------------------------

enhancedNames = imageIDs + "_enhanced.png";

%% ----------------------------------------------------
% CHECK IMAGE EXISTENCE
% -----------------------------------------------------

exists = false(height(S),1);

for i = 1:height(S)

    imagePath = fullfile( ...
        imageFolder, ...
        char(enhancedNames(i)));

    exists(i) = isfile(imagePath);

end

fprintf('Images found         : %d\n', sum(exists));
fprintf('Images missing       : %d\n', sum(~exists));

%% Keep only valid images

S = S(exists,:);

enhancedNames = enhancedNames(exists);
imageIDs = imageIDs(exists);

%% ----------------------------------------------------
% CREATE LABELS
% -----------------------------------------------------

labels = categorical(S.diagnosis, ...
    0:4, ...
    {'Grade0','Grade1','Grade2','Grade3','Grade4'});

%% ----------------------------------------------------
% DISPLAY CLASS DISTRIBUTION
% -----------------------------------------------------

fprintf('\nDR GRADE DISTRIBUTION\n');
fprintf('---------------------\n');

for g = 0:4

    count = sum(S.diagnosis == g);

    fprintf('Grade %d : %d images (%.2f%%)\n', ...
        g, ...
        count, ...
        100*count/height(S));

end

%% ----------------------------------------------------
% CREATE HANDCRAFTED FEATURE MATRIX
% -----------------------------------------------------

X = [ ...
    S.vesselCoverage, ...
    S.lesionCoverage, ...
    S.totalLesionArea, ...
    S.lesionCount, ...
    S.brightLesionCount, ...
    S.darkLesionCount, ...
    S.meanLesionArea];

featureNames = { ...
    'vesselCoverage', ...
    'lesionCoverage', ...
    'totalLesionArea', ...
    'lesionCount', ...
    'brightLesionCount', ...
    'darkLesionCount', ...
    'meanLesionArea'};

fprintf('\nHandcrafted features : %d\n', size(X,2));

%% ----------------------------------------------------
% NORMALIZE FEATURES
% -----------------------------------------------------

featureMean = mean(X,1);

featureStd = std(X,0,1);

featureStd(featureStd == 0) = 1;

Xnorm = ...
    (X-featureMean) ./ featureStd;

%% ----------------------------------------------------
% RANDOM REPRODUCIBLE SPLIT
% -----------------------------------------------------

rng(42);

N = height(S);

randomOrder = randperm(N);

nTrain = floor(0.70*N);
nVal   = floor(0.15*N);

trainIdx = randomOrder(1:nTrain);

valIdx = ...
    randomOrder(nTrain+1:nTrain+nVal);

testIdx = ...
    randomOrder(nTrain+nVal+1:end);

%% ----------------------------------------------------
% PREPARE TABLE
% -----------------------------------------------------

Prepared = table( ...
    imageIDs, ...
    enhancedNames, ...
    S.diagnosis, ...
    labels, ...
    S.vesselCoverage, ...
    S.lesionCoverage, ...
    S.totalLesionArea, ...
    S.lesionCount, ...
    S.brightLesionCount, ...
    S.darkLesionCount, ...
    S.meanLesionArea, ...
    'VariableNames', { ...
    'imageID', ...
    'enhancedImage', ...
    'diagnosis', ...
    'label', ...
    'vesselCoverage', ...
    'lesionCoverage', ...
    'totalLesionArea', ...
    'lesionCount', ...
    'brightLesionCount', ...
    'darkLesionCount', ...
    'meanLesionArea'});

%% ----------------------------------------------------
% SPLIT ASSIGNMENT
% -----------------------------------------------------

split = strings(N,1);

split(trainIdx) = "TRAIN";
split(valIdx)   = "VALIDATION";
split(testIdx)  = "TEST";

Prepared.split = split;

%% ----------------------------------------------------
% SAVE NORMALIZATION PARAMETERS
% -----------------------------------------------------

save( ...
    fullfile(outputFolder, ...
    "grading_normalization.mat"), ...
    "featureMean", ...
    "featureStd", ...
    "featureNames");

%% ----------------------------------------------------
% SAVE PREPARED DATA
% -----------------------------------------------------

outputFile = fullfile( ...
    outputFolder, ...
    "APTOS_Grading_Prepared.csv");

writetable(Prepared,outputFile);

%% ----------------------------------------------------
% SUMMARY
% -----------------------------------------------------

fprintf('\n====================================================\n');
fprintf('       GRADING DATA PREPARATION COMPLETED\n');
fprintf('====================================================\n');

fprintf('Total valid images : %d\n',N);
fprintf('Training images    : %d\n',length(trainIdx));
fprintf('Validation images  : %d\n',length(valIdx));
fprintf('Test images        : %d\n',length(testIdx));

fprintf('\nPrepared dataset:\n%s\n',outputFile);

fprintf('\n====================================================\n');