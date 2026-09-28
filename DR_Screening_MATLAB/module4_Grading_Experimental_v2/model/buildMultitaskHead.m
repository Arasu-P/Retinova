function headParams = buildMultitaskHead(cfg)
% BUILDMULTITASKHEAD - Initializes parameters for the shared bottleneck (2048->512),
% Ordinal Head (512->4 with monotonic cutoffs), and Referable Head (512->1).

if nargin < 1
    cfg = config();
end

rng(cfg.seed);

fDim = cfg.featureDim;     % 2048
bDim = cfg.bottleneckDim;  % 512

% 1. Shared Bottleneck: FC 2048 -> 512
% He / Kaiming normal initialization
W_bn = dlarray(randn(bDim, fDim, 'single') * sqrt(2.0 / fDim));
b_bn = dlarray(zeros(bDim, 1, 'single'));

% BatchNorm parameters (scale gamma, offset beta)
bn_gamma = dlarray(ones(bDim, 1, 'single'));
bn_beta  = dlarray(zeros(bDim, 1, 'single'));

% 2. Ordinal Head: FC 512 -> 1 scalar severity s(x)
W_ord = dlarray(randn(1, bDim, 'single') * sqrt(2.0 / bDim));
b_ord = dlarray(single(0.0));

% Monotonic cutoffs: theta_1 = c1, theta_k = theta_{k-1} + exp(delta_k)
c1_init = single(0.5);
d2_init = single(log(1.0));
d3_init = single(log(1.0));
d4_init = single(log(1.0));
cutoffs = dlarray([c1_init; d2_init; d3_init; d4_init]);

% 3. Referable Head: FC 512 -> 1 logit z_ref(x)
W_ref = dlarray(randn(1, bDim, 'single') * sqrt(2.0 / bDim));
b_ref = dlarray(single(0.0));

headParams = struct();
headParams.W_bn     = W_bn;
headParams.b_bn     = b_bn;
headParams.bn_gamma = bn_gamma;
headParams.bn_beta  = bn_beta;
headParams.W_ord    = W_ord;
headParams.b_ord    = b_ord;
headParams.cutoffs  = cutoffs;
headParams.W_ref    = W_ref;
headParams.b_ref    = b_ref;

end
