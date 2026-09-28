function result = run_Segmentation(img)
% run_Segmentation
% ============================================================
% MODULE 3 - RETINAL VESSEL + LESION EVIDENCE
%
% Input:
%   img - RGB or grayscale fundus image
%
% Output:
%   result - segmentation result structure
%
% IMPORTANT:
% Lesion output represents lesion candidates/evidence.
% It is NOT a clinical diagnosis.
% ============================================================

%% Input validation

if nargin < 1
    error('run_Segmentation requires an input image.');
end

%% Run existing segmentation engine

[lesionMask, vesselMask, debug] = segment_lesions(img);

%% Basic dimensions

imagePixels = numel(lesionMask);

%% Coverage

vesselCoverage = ...
    100 * nnz(vesselMask) / imagePixels;

lesionCoverage = ...
    100 * nnz(lesionMask) / imagePixels;

%% Lesion connected components

CC = bwconncomp(lesionMask);

lesionCount = CC.NumObjects;

%% Lesion areas

if lesionCount > 0

    lesionAreas = cellfun(@numel,CC.PixelIdxList);

    totalLesionArea = sum(lesionAreas);

    meanLesionArea = mean(lesionAreas);

else

    lesionAreas = [];

    totalLesionArea = 0;

    meanLesionArea = 0;

end

%% Bright / dark lesion candidates

if isfield(debug,'brightLesionMask')

    brightMask = debug.brightLesionMask;

    brightCC = bwconncomp(brightMask);

    brightLesionCount = brightCC.NumObjects;

else

    brightLesionCount = 0;

end

if isfield(debug,'darkLesionMask')

    darkMask = debug.darkLesionMask;

    darkCC = bwconncomp(darkMask);

    darkLesionCount = darkCC.NumObjects;

else

    darkLesionCount = 0;

end

%% ------------------------------------------------------------
% Evidence overlay
% ------------------------------------------------------------

if size(img,3) == 1
    displayImg = repmat(im2double(img),[1 1 3]);
else
    displayImg = im2double(img);
end

% Normalize for display
displayImg = mat2gray(displayImg);

% Vessel evidence
vesselOverlay = cat(3, ...
    zeros(size(vesselMask)), ...
    ones(size(vesselMask)), ...
    zeros(size(vesselMask)));

% Lesion evidence
lesionOverlay = cat(3, ...
    ones(size(lesionMask)), ...
    zeros(size(lesionMask)), ...
    zeros(size(lesionMask)));

% Blend
evidenceOverlay = displayImg;

vesselAlpha = 0.30;
lesionAlpha = 0.55;

for c = 1:3

    channel = evidenceOverlay(:,:,c);

    vesselChannel = vesselOverlay(:,:,c);
    lesionChannel = lesionOverlay(:,:,c);

    channel(vesselMask) = ...
        (1-vesselAlpha)*channel(vesselMask) + ...
        vesselAlpha*vesselChannel(vesselMask);

    channel(lesionMask) = ...
        (1-lesionAlpha)*channel(lesionMask) + ...
        lesionAlpha*lesionChannel(lesionMask);

    evidenceOverlay(:,:,c) = channel;

end

%% Output structure

result = struct();

result.lesionMask = lesionMask;
result.vesselMask = vesselMask;

result.vesselCoverage = vesselCoverage;
result.lesionCoverage = lesionCoverage;

result.totalLesionArea = totalLesionArea;
result.lesionCount = lesionCount;

result.brightLesionCount = brightLesionCount;
result.darkLesionCount = darkLesionCount;

result.meanLesionArea = meanLesionArea;

result.evidenceOverlay = evidenceOverlay;

result.debug = debug;

result.status = "SUCCESS";

%% Console report

fprintf('\n');
fprintf('============================================================\n');
fprintf('MODULE 3 - RETINAL EVIDENCE SEGMENTATION\n');
fprintf('============================================================\n');

fprintf('Vessel Coverage       : %.2f%%\n',vesselCoverage);
fprintf('Lesion Coverage       : %.2f%%\n',lesionCoverage);

fprintf('Total Lesion Area     : %d pixels\n',totalLesionArea);
fprintf('Lesion Candidates     : %d\n',lesionCount);

fprintf('Bright Candidates     : %d\n',brightLesionCount);
fprintf('Dark Candidates       : %d\n',darkLesionCount);

fprintf('Mean Candidate Area   : %.2f pixels\n',meanLesionArea);

fprintf('------------------------------------------------------------\n');
fprintf('Status                : SUCCESS\n');
fprintf('============================================================\n');

end