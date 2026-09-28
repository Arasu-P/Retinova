function [loss, lossOrd, lossRef] = totalLoss(cumProbs, ordTargets, pRef, refTargets, effWeights, lambda_ord, lambda_ref, headParams, weightDecay)
% TOTALLOSS - Combined multitask loss: L_total = lambda_ord * L_ord + lambda_ref * L_ref + L2_reg.

if nargin < 9
    weightDecay = 1e-4;
end

lossOrd = ordinalLossWeighted(cumProbs, ordTargets, effWeights);
lossRef = focalLoss(pRef, refTargets, 2.0);

loss = single(lambda_ord) * lossOrd + single(lambda_ref) * lossRef;

if weightDecay > 0
    reg = sum(headParams.W_bn(:).^2) + sum(headParams.W_ord(:).^2) + sum(headParams.W_ref(:).^2);
    loss = loss + single(weightDecay) * reg;
end

end
