function [features, evidenceSummary] = extract_clinical_evidence(probMaps, binaryMasks, fovMask, odLoc, foveaLoc)
% EXTRACT_CLINICAL_EVIDENCE
% Computes 24-dimensional explainable clinical evidence feature vector
% based on ICDR international clinical classification guidelines.
%
% Channels in probMaps/binaryMasks:
%   1: Microaneurysms (MA)
%   2: Haemorrhages (HE)
%   3: Hard Exudates (EX)
%   4: Soft Exudates / Cotton-wool spots (SE)

if nargin < 3 || isempty(fovMask), fovMask = true(size(probMaps, 1), size(probMaps, 2)); end
if nargin < 4 || isempty(odLoc), odLoc = [size(probMaps, 2)*0.8, size(probMaps, 1)*0.5]; end
if nargin < 5 || isempty(foveaLoc), foveaLoc = [size(probMaps, 2)*0.5, size(probMaps, 1)*0.5]; end

[H, W, ~] = size(probMaps);
fovArea = sum(fovMask(:));

% 1. Microaneurysm (MA) Metrics
maMask = binaryMasks(:, :, 1) & fovMask;
maCC = bwconncomp(maMask);
maCount = maCC.NumObjects;
maArea = sum(maMask(:));
maDensity = maArea / max(fovArea, 1);
maMaxComponent = 0;
if maCount > 0
    props = regionprops(maCC, 'Area');
    maMaxComponent = max([props.Area]);
end

% 2. Haemorrhage (HE) Metrics & 4-Quadrant Partitioning (ICDR 4-2-1 Rule)
heMask = binaryMasks(:, :, 2) & fovMask;
heCC = bwconncomp(heMask);
heCount = heCC.NumObjects;
heArea = sum(heMask(:));
heDensity = heArea / max(fovArea, 1);

% Quadrant distribution relative to fovea
quadCount = zeros(1, 4);
if heCount > 0
    props = regionprops(heCC, 'Centroid');
    for i = 1:heCount
        cx = props(i).Centroid(1);
        cy = props(i).Centroid(2);
        if cx >= foveaLoc(1) && cy <= foveaLoc(2)
            quadCount(1) = quadCount(1) + 1; % Q1: Superior-Temporal
        elseif cx < foveaLoc(1) && cy <= foveaLoc(2)
            quadCount(2) = quadCount(2) + 1; % Q2: Superior-Nasal
        elseif cx < foveaLoc(1) && cy > foveaLoc(2)
            quadCount(3) = quadCount(3) + 1; % Q3: Inferior-Nasal
        else
            quadCount(4) = quadCount(4) + 1; % Q4: Inferior-Temporal
        end
    end
end
quadsWithSevereHE = sum(quadCount >= 20); % Standard ICDR threshold (>20 HE in a quadrant)

% 3. Hard Exudate (EX) & Macular Involvement (CSME / DME)
exMask = binaryMasks(:, :, 3) & fovMask;
exCC = bwconncomp(exMask);
exCount = exCC.NumObjects;
exArea = sum(exMask(:));
exDensity = exArea / max(fovArea, 1);

% Distance from Fovea
[Xgrid, Ygrid] = meshgrid(1:W, 1:H);
distFromFovea = sqrt((Xgrid - foveaLoc(1)).^2 + (Ygrid - foveaLoc(2)).^2);
exInFovea1DD = sum(exMask(:) & (distFromFovea <= 0.15 * min(H, W))); % Within 1 Disc Diameter
csmeRisk = exInFovea1DD > 10;

% 4. Soft Exudate (SE) / Cotton Wool Spots
seMask = binaryMasks(:, :, 4) & fovMask;
seCC = bwconncomp(seMask);
seCount = seCC.NumObjects;
seArea = sum(seMask(:));
seDensity = seArea / max(fovArea, 1);

% Assemble 24-D Feature Vector
features = [
    maCount, ...                    % 1
    maArea, ...                     % 2
    maDensity, ...                  % 3
    maMaxComponent, ...             % 4
    heCount, ...                    % 5
    heArea, ...                     % 6
    heDensity, ...                  % 7
    quadCount(1), ...               % 8: Q1 HE
    quadCount(2), ...               % 9: Q2 HE
    quadCount(3), ...               % 10: Q3 HE
    quadCount(4), ...               % 11: Q4 HE
    quadsWithSevereHE, ...          % 12
    exCount, ...                    % 13
    exArea, ...                     % 14
    exDensity, ...                  % 15
    exInFovea1DD, ...               % 16: Macular Exudate Count
    double(csmeRisk), ...           % 17: CSME indicator
    seCount, ...                    % 18
    seArea, ...                     % 19
    seDensity, ...                  % 20
    mean(probMaps(:, :, 1), 'all'), % 21: MA Mean Prob
    mean(probMaps(:, :, 2), 'all'), % 22: HE Mean Prob
    mean(probMaps(:, :, 3), 'all'), % 23: EX Mean Prob
    mean(probMaps(:, :, 4), 'all')  % 24: SE Mean Prob
];

evidenceSummary = struct();
evidenceSummary.maCount = maCount;
evidenceSummary.maArea = maArea;
evidenceSummary.heCount = heCount;
evidenceSummary.heArea = heArea;
evidenceSummary.quadsWithSevereHE = quadsWithSevereHE;
evidenceSummary.exCount = exCount;
evidenceSummary.exArea = exArea;
evidenceSummary.exInFovea1DD = exInFovea1DD;
evidenceSummary.csmeRisk = csmeRisk;
evidenceSummary.seCount = seCount;
evidenceSummary.seArea = seArea;
end
