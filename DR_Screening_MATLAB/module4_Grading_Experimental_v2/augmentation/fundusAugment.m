function augImg = fundusAugment(img, cfg)
% FUNDUSAUGMENT - Train-only safe fundus data augmentation.

if nargin < 2
    cfg = config();
end

augImg = img;

% 1. Random Horizontal Flip
if cfg.augFlipH && (rand() > 0.5)
    augImg = fliplr(augImg);
end

% 2. Random Vertical Flip
if rand() > 0.5
    augImg = flipud(augImg);
end

% 3. Random Subtle Rotation (-15 to +15 deg)
rotAngle = (rand() * 2 - 1) * cfg.augMaxRotation;
augImg = imrotate(augImg, rotAngle, 'bilinear', 'crop');

% 4. Random Subtle Scale (0.9 to 1.1)
scaleFactor = cfg.augScaleRange(1) + rand() * (cfg.augScaleRange(2) - cfg.augScaleRange(1));
h = size(augImg, 1);
w = size(augImg, 2);
scaled = imresize(augImg, scaleFactor);
if scaleFactor > 1.0
    % Center crop
    sh = size(scaled, 1); sw = size(scaled, 2);
    r1 = floor((sh - h)/2) + 1;
    c1 = floor((sw - w)/2) + 1;
    augImg = scaled(r1:r1+h-1, c1:c1+w-1, :);
else
    % Pad
    sh = size(scaled, 1); sw = size(scaled, 2);
    padImg = zeros(h, w, size(augImg, 3), 'like', augImg);
    r1 = floor((h - sh)/2) + 1;
    c1 = floor((w - sw)/2) + 1;
    padImg(r1:r1+sh-1, c1:c1+sw-1, :) = scaled;
    augImg = padImg;
end

% 5. Random Brightness & Contrast
bJitter = (rand() * 2 - 1) * cfg.augBrightnessRange(2);
cJitter = cfg.augContrastRange(1) + rand() * (cfg.augContrastRange(2) - cfg.augContrastRange(1));

augImg = single(augImg) * cJitter + bJitter;

end
