function normImg = illuminationNormalize(img, sigma)
% ILLUMINATIONNORMALIZE - Normalizes uneven illumination using local Gaussian background correction.

if nargin < 2
    sigma = 30;
end

imgD = im2double(img);
bg = imgaussfilt(imgD, sigma);

meanBg = mean(mean(bg, 1), 2);
normImg = imgD - bg + meanBg;

% Clip to [0, 1]
normImg = max(min(normImg, 1.0), 0.0);
normImg = im2uint8(normImg);

end
