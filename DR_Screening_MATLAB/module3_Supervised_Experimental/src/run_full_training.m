% RUN_FULL_TRAINING.M
% Executes full 25-epoch Lesion U-Net training on RTX 3050 GPU,
% trains the Optic Disc Locator, evaluates on the 11-image validation set,
% and tests the 24-D clinical evidence feature extraction pipeline.

clear; clc;
fprintf('===========================================================================\n');
fprintf('STEP 8G: FULL TRAINING OF 4-CHANNEL LESION U-NET\n');
fprintf('===========================================================================\n');

addpath('C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\module3_Supervised_Experimental\src');

opts = struct();
opts.numEpochs = 25;
opts.batchSize = 4;
opts.initialLearnRate = 3e-4;
opts.minLearnRate = 1e-6;

t_start = tic;

% 1. Train Lesion U-Net
[net, history] = train_lesion_unet('C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\module3_Supervised_Experimental\data\patches_512', 'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\module3_Supervised_Experimental\results', opts);

fprintf('\n===========================================================================\n');
fprintf('STEP 8H: OPTIC DISC LOCATOR INITIALIZATION\n');
fprintf('===========================================================================\n');
odModel = train_optic_disc_locator('', 'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\module3_Supervised_Experimental\results');

fprintf('\n===========================================================================\n');
fprintf('STEP 8I: VALIDATION SET EVALUATION (11 IMAGES / 220 PATCHES)\n');
fprintf('===========================================================================\n');
valRes = evaluate_validation_set(...
    fullfile('C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\module3_Supervised_Experimental\results', 'net_lesion_final.mat'), ...
    fullfile('C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\module3_Supervised_Experimental\data\patches_512', 'val_cache.mat'), ...
    'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\module3_Supervised_Experimental\results');


fprintf('\n===========================================================================\n');
fprintf('STEP 8J: TESTING CLINICAL EVIDENCE EXTRACTION PIPELINE\n');
fprintf('===========================================================================\n');
sampleValImgs = dir(fullfile('C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\module3_Supervised_Experimental\data\patches_512', 'val', 'images', '*.png'));
if ~isempty(sampleValImgs)
    testImPath = fullfile(sampleValImgs(1).folder, sampleValImgs(1).name);
    testIm = imread(testImPath);
    [probMaps, binMasks] = predict_lesion_tiled(net, testIm, 512, 256);
    [feat24, summary] = extract_clinical_evidence(probMaps, binMasks);
    fprintf('Extracted 24-D Clinical Evidence Feature Vector: [%s]\n', num2str(feat24(1:8), '%.2f '));
    fprintf('  MA Count: %d | HE Count: %d | Severe HE Quads: %d | CSME Risk: %d\n', ...
        summary.maCount, summary.heCount, summary.quadsWithSevereHE, summary.csmeRisk);
end

fprintf('\nTotal Pipeline Execution Time: %.2f minutes\n', toc(t_start)/60);
fprintf('All artifacts and evaluation reports successfully generated.\n');
