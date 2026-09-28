function [loss, gradients] = focal_tversky_dice_loss(net, X, Y)
% FOCAL_TVERSKY_DICE_LOSS
% Evaluates multi-channel compound Focal-Tversky + Soft Dice loss and computes dlgradients.
%
% Channels:
% 1: Microaneurysms (MA)
% 2: Haemorrhages (HE)
% 3: Hard Exudates (EX)
% 4: Soft Exudates (SE)

Y_pred = forward(net, X);

eps_val = 1e-6;
alpha = 0.3;      % Higher weight on false negatives (beta=0.7) to maximize recall
beta = 0.7;
gamma_val = 1.33;

total_loss = 0;
num_ch = size(Y, 3);

for c = 1:num_ch
    p = Y_pred(:, :, c, :);
    g = Y(:, :, c, :);
    
    tp = sum(p .* g, 'all');
    fp = sum(p .* (1 - g), 'all');
    fn = sum((1 - p) .* g, 'all');
    
    tversky = (tp + eps_val) / (tp + alpha * fp + beta * fn + eps_val);
    focal_tversky = (1 - tversky)^gamma_val;
    
    % Soft Dice
    dice_val = (2 * tp + eps_val) / (sum(p.^2, 'all') + sum(g.^2, 'all') + eps_val);
    dice_loss = 1 - dice_val;
    
    total_loss = total_loss + (focal_tversky + dice_loss);
end

loss = total_loss / num_ch;
gradients = dlgradient(loss, net.Learnables);
end
