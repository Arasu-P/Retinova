function procImg = preprocessPipeline(img, targetSize)
% PREPROCESSPIPELINE - Full deterministic fundus preprocessing pipeline.
% FOV Crop -> Illumination Normalization -> Resize 384x384 -> ImageNet Normalization.

if nargin < 2
    targetSize = [384, 384, 3];
end

if size(img, 3) == 1
    img = repmat(img, [1 1 3]);
end

% 1. FOV Crop & Square
imgCrop = fovCrop(img, 10);

% 2. Illumination Correction
imgIllum = illuminationNormalize(imgCrop, 30);

% 3. Resize to 384x384
imgResized = imresize(imgIllum, targetSize(1:2));

% 4. ImageNet Standardization
imgD = single(imgResized) / 255.0;
meanVals = reshape(single([0.485, 0.456, 0.406]), [1, 1, 3]);
stdVals  = reshape(single([0.229, 0.224, 0.225]), [1, 1, 3]);

procImg = (imgD - meanVals) ./ stdVals;

end
