function cfg = config()
% CONFIG - Central Configuration for Experimental Module 4 v2
% (NetraAI / SIH26038)

cfg = struct();

% Project Paths
cfg.projectRoot = 'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB';
cfg.csvPath     = fullfile(cfg.projectRoot, 'data', 'EyeQ', 'data', 'Label_EyeQ_train.csv');
cfg.imgDir      = fullfile(cfg.projectRoot, 'data', 'EyePACS', 'download', 'train', 'extracted', 'train');
cfg.splitPath   = fullfile(cfg.projectRoot, 'results', 'Experimental_ResNet50_Ordinal', 'ResNet50_Ordinal_Splits.mat');
cfg.moduleDir   = fullfile(cfg.projectRoot, 'module4_Grading_Experimental_v2');
cfg.resultsDir  = fullfile(cfg.moduleDir, 'results');

if ~isfolder(cfg.resultsDir)
    mkdir(cfg.resultsDir);
end

% Image & Preprocessing
cfg.inputSize        = [384, 384, 3];
cfg.fovThreshold     = 10;
cfg.gaussianSigma    = 30;

% Augmentation (Train only)
cfg.augMaxRotation     = 15;
cfg.augScaleRange      = [0.90, 1.10];
cfg.augBrightnessRange = [-0.08, 0.08];
cfg.augContrastRange   = [0.90, 1.10];
cfg.augFlipH           = true;

% Architecture
cfg.backboneName   = 'resnet50';
cfg.featureDim     = 2048;
cfg.bottleneckDim  = 512;
cfg.dropoutRate    = 0.40;
cfg.numOrdinal     = 4;
cfg.numReferable   = 1;

% Loss configuration
cfg.lambda_ordinal         = 1.0;
cfg.lambda_ref_candidates  = [0.3, 0.5, 0.75, 1.0];
cfg.beta_effective         = 0.99;
cfg.focal_gamma            = 2.0;

% Training schedule
cfg.seed           = 42;
cfg.batchSize      = 32;
cfg.maxEpochs      = 60;
cfg.baseLR         = 1e-4;
cfg.minLR          = 1e-6;
cfg.warmupEpochs   = 2;
cfg.weightDecay    = 1e-4;
cfg.patience       = 8;
cfg.unfreezeEpoch  = 6;

% Referable threshold sweep target
cfg.minSpecificity = 0.65;

end
