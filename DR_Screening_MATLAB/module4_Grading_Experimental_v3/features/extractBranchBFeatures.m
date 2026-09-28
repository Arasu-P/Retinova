function [featVec, featNames] = extractBranchBFeatures(lesionMask, vesselMask, debug)
% EXTRACTBRANCHBFEATURES - Computes a fixed-length 49-D structured retinal feature vector
% from existing Module 3 segmentation outputs.
%
% Input:
%   lesionMask - binary mask of candidate lesions [H x W]
%   vesselMask - binary mask of segmented vessels [H x W]
%   debug      - debug struct from segment_lesions.m
%
% Output:
%   featVec    - 1 x 49 single feature vector
%   featNames  - 1 x 49 cell array of feature names

if nargin < 3 || isempty(debug)
    error('extractBranchBFeatures requires lesionMask, vesselMask, and debug struct from Module 3.');
end

% Ensure logical
lesionMask = logical(lesionMask);
vesselMask = logical(vesselMask);

% FOV Mask
if isfield(debug, 'fovMaskNative') && ~isempty(debug.fovMaskNative)
    fovMask = logical(debug.fovMaskNative);
else
    fovMask = true(size(vesselMask));
end
fovArea = max(1, double(nnz(fovMask)));
totalPixels = max(1, double(numel(vesselMask)));

%% ============================================================
% A. VESSEL FEATURES (11 Features)
%% ============================================================
vesselArea = double(nnz(vesselMask));
vesselFOVRatio = vesselArea / fovArea;
vesselPixelDensity = vesselArea / totalPixels;

CC_vessel = bwconncomp(vesselMask, 8);
vesselCompCount = double(CC_vessel.NumObjects);

if isfield(debug, 'vesselSkelStd') && ~isempty(debug.vesselSkelStd)
    vesselSkel = logical(debug.vesselSkelStd);
else
    vesselSkel = bwskel(vesselMask);
end

vesselSkelLength = double(nnz(vesselSkel));
fovStdArea = max(1, double(nnz(imresize(fovMask, size(vesselSkel), 'nearest'))));
vesselSkelDensity = vesselSkelLength / fovStdArea;

bpImg = bwmorph(vesselSkel, 'branchpoints');
vesselBranchPoints = double(nnz(bpImg));
vesselBranchDensity = vesselBranchPoints / max(1, vesselSkelLength);

epImg = bwmorph(vesselSkel, 'endpoints');
vesselEndpoints = double(nnz(epImg));

% Approximate vessel width via distance transform
if vesselArea > 0
    distMap = bwdist(~vesselMask);
    vesselDistVals = double(distMap(vesselMask));
    vesselMeanWidth = 2.0 * mean(vesselDistVals);
    vesselStdWidth  = 2.0 * std(vesselDistVals);
else
    vesselMeanWidth = 0.0;
    vesselStdWidth  = 0.0;
end

%% ============================================================
% B. CANDIDATE LESION EVIDENCE FEATURES (15 Features)
%% ============================================================
lesionArea = double(nnz(lesionMask));
lesionFOVRatio = lesionArea / fovArea;

CC_lesion = bwconncomp(lesionMask, 8);
lesionCompCount = double(CC_lesion.NumObjects);

if lesionCompCount > 0
    lesionStats = regionprops(CC_lesion, 'Area');
    areas = double([lesionStats.Area]);
    lesionMeanArea   = mean(areas);
    lesionStdArea    = std(areas);
    lesionMedianArea = median(areas);
    lesionMaxArea    = max(areas);
    propTinyLesions  = double(sum(areas < 10)) / lesionCompCount;
    propLargeLesions = double(sum(areas > 100)) / lesionCompCount;
else
    lesionMeanArea   = 0.0;
    lesionStdArea    = 0.0;
    lesionMedianArea = 0.0;
    lesionMaxArea    = 0.0;
    propTinyLesions  = 0.0;
    propLargeLesions = 0.0;
end

% Bright candidates
if isfield(debug, 'brightLesionMask') && ~isempty(debug.brightLesionMask)
    brightMask = logical(debug.brightLesionMask);
else
    brightMask = false(size(lesionMask));
end
brightArea = double(nnz(brightMask));
brightFOVRatio = brightArea / fovArea;
CC_bright = bwconncomp(brightMask, 8);
brightCount = double(CC_bright.NumObjects);

% Dark candidates
if isfield(debug, 'darkLesionMask') && ~isempty(debug.darkLesionMask)
    darkMask = logical(debug.darkLesionMask);
else
    darkMask = false(size(lesionMask));
end
darkArea = double(nnz(darkMask));
darkFOVRatio = darkArea / fovArea;
CC_dark = bwconncomp(darkMask, 8);
darkCount = double(CC_dark.NumObjects);

lesionDensity = lesionArea / fovArea;
largestLesionFOVRatio = lesionMaxArea / fovArea;

%% ============================================================
% C. REGIONAL QUADRANT FEATURES (16 Features)
%% ============================================================
% Find FOV Centroid
[rFOV, cFOV] = find(fovMask);
if ~isempty(rFOV)
    rC = mean(rFOV);
    cC = mean(cFOV);
else
    rC = size(fovMask, 1) / 2;
    cC = size(fovMask, 2) / 2;
end

[H, W] = size(fovMask);
[gridC, gridR] = meshgrid(1:W, 1:H);

% 4 Quadrants: Q1 (Top-Left), Q2 (Top-Right), Q3 (Bottom-Left), Q4 (Bottom-Right)
maskQ1 = (gridR <= rC) & (gridC <= cC) & fovMask;
maskQ2 = (gridR <= rC) & (gridC >  cC) & fovMask;
maskQ3 = (gridR >  rC) & (gridC <= cC) & fovMask;
maskQ4 = (gridR >  rC) & (gridC >  cC) & fovMask;

computeQuad = @(qMask) [ ...
    double(nnz(lesionMask & qMask)), ...
    double(bwconncomp(lesionMask & qMask, 8).NumObjects), ...
    double(nnz(vesselMask & qMask)) / max(1, double(nnz(qMask))), ...
    double(nnz(lesionMask & qMask)) / max(1, double(nnz(qMask))) ...
];

quadQ1 = computeQuad(maskQ1);
quadQ2 = computeQuad(maskQ2);
quadQ3 = computeQuad(maskQ3);
quadQ4 = computeQuad(maskQ4);

%% ============================================================
% D. ROBUSTNESS & QUALITY EVIDENCE FEATURES (7 Features)
%% ============================================================
fovCoverageRatio = fovArea / totalPixels;
vesselRetinaRatio = vesselArea / fovArea;
lesionVesselRatio = lesionArea / max(1, vesselArea);

if isfield(debug, 'discMask') && ~isempty(debug.discMask)
    discMask = logical(debug.discMask);
    discDetected = double(any(discMask(:)));
    discAreaFOVRatio = double(nnz(discMask)) / fovArea;
else
    discDetected = 0.0;
    discAreaFOVRatio = 0.0;
end

%% ============================================================
% ASSEMBLE FEATURE VECTOR & NAMES
%% ============================================================
featVec = single([ ...
    vesselArea, vesselFOVRatio, vesselPixelDensity, vesselCompCount, ...
    vesselSkelLength, vesselSkelDensity, vesselBranchPoints, vesselBranchDensity, ...
    vesselEndpoints, vesselMeanWidth, vesselStdWidth, ...
    ...
    lesionArea, lesionFOVRatio, lesionCompCount, lesionMeanArea, ...
    lesionStdArea, lesionMedianArea, lesionMaxArea, brightCount, ...
    brightArea, brightFOVRatio, darkCount, darkArea, darkFOVRatio, ...
    lesionDensity, largestLesionFOVRatio, ...
    ...
    quadQ1, quadQ2, quadQ3, quadQ4, ...
    ...
    fovCoverageRatio, vesselRetinaRatio, lesionVesselRatio, ...
    propTinyLesions, propLargeLesions, discDetected, discAreaFOVRatio ...
]);

featNames = { ...
    'vessel_area_pixels', 'vessel_fov_ratio', 'vessel_pixel_density', 'vessel_connected_components', ...
    'vessel_skeleton_length', 'vessel_skeleton_density', 'vessel_branch_point_count', 'vessel_branch_point_density', ...
    'vessel_end_point_count', 'vessel_mean_width_approx', 'vessel_std_width_approx', ...
    ...
    'candidate_lesion_area', 'candidate_lesion_fov_ratio', 'candidate_component_count', 'candidate_mean_area', ...
    'candidate_std_area', 'candidate_median_area', 'candidate_max_area', 'candidate_bright_count', ...
    'candidate_bright_area', 'candidate_bright_fov_ratio', 'candidate_dark_count', 'candidate_dark_area', 'candidate_dark_fov_ratio', ...
    'candidate_density', 'candidate_largest_area_fov_ratio', ...
    ...
    'q1_candidate_area', 'q1_candidate_count', 'q1_vessel_density', 'q1_candidate_fov_ratio', ...
    'q2_candidate_area', 'q2_candidate_count', 'q2_vessel_density', 'q2_candidate_fov_ratio', ...
    'q3_candidate_area', 'q3_candidate_count', 'q3_vessel_density', 'q3_candidate_fov_ratio', ...
    'q4_candidate_area', 'q4_candidate_count', 'q4_vessel_density', 'q4_candidate_fov_ratio', ...
    ...
    'fov_coverage_ratio', 'vessel_retina_ratio', 'lesion_vessel_ratio', ...
    'prop_tiny_candidates', 'prop_large_candidates', 'optic_disc_detected', 'optic_disc_area_fov_ratio' ...
};

end
