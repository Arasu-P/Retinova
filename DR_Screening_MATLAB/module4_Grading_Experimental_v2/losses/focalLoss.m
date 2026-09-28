function loss = focalLoss(pRef, targets, gamma)
% FOCALLOSS - Computes binary focal loss for the referable DR head.
%
% Inputs:
%   pRef    - 1 x B matrix of P(referable) in [0, 1]
%   targets - 1 x B matrix of binary targets in {0, 1}
%   gamma   - focal focusing parameter (default = 2.0)

if nargin < 3
    gamma = 2.0;
end

eps_val = single(1e-7);
pRef = max(min(pRef, 1.0 - eps_val), eps_val);

% p_t = p if y=1 else (1-p)
p_t = targets .* pRef + (1.0 - targets) .* (1.0 - pRef);

fl = - ((1.0 - p_t) .^ single(gamma)) .* log(p_t);
loss = mean(fl);

end
