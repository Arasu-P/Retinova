function [croppedImg, bbox] = fovCrop(img, threshold)
% FOVCROP - Detects retinal field-of-view (FOV), crops black border, and pads/crops to square.

if nargin < 2
    threshold = 10;
end

if size(img, 3) == 1
    gray = img;
else
    gray = rgb2gray(img);
end

mask = gray > threshold;

% Find bounding box
[rows, cols] = find(mask);
if isempty(rows) || isempty(cols)
    croppedImg = img;
    bbox = [1, 1, size(img, 2), size(img, 1)];
    return;
end

rMin = max(min(rows) - 2, 1);
rMax = min(max(rows) + 2, size(img, 1));
cMin = max(min(cols) - 2, 1);
cMax = min(max(cols) + 2, size(img, 2));

h = rMax - rMin + 1;
w = cMax - cMin + 1;

% Crop
crop = img(rMin:rMax, cMin:cMax, :);

% Center square pad/crop
maxDim = max(h, w);
sqImg = zeros(maxDim, maxDim, size(img, 3), 'like', img);

rOff = floor((maxDim - h) / 2) + 1;
cOff = floor((maxDim - w) / 2) + 1;

sqImg(rOff:rOff+h-1, cOff:cOff+w-1, :) = crop;
croppedImg = sqImg;
bbox = [cMin, rMin, w, h];

end
