function evaluate_IDRiD_Experimental(idridImageDir, idridCSV)
% EVALUATE_IDRID_EXPERIMENTAL
% ============================================================
% Evaluates the frozen ResNet-50 Ordinal model on IDRiD dataset.
%
% Usage:
%   evaluate_IDRiD_Experimental(idridImageDir, idridCSV)
% ============================================================

projectRoot = 'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB';
modelPath = fullfile(projectRoot, 'results', 'Experimental_ResNet50_Ordinal', 'ResNet50_Ordinal_DR_Model.mat');

if ~isfile(modelPath)
    error('Trained model not found at: %s', modelPath);
end

if nargin < 1 || isempty(idridImageDir)
    idridImageDir = fullfile(projectRoot, 'data', 'IDRiD', 'images');
end
if nargin < 2 || isempty(idridCSV)
    idridCSV = fullfile(projectRoot, 'data', 'IDRiD', 'labels.csv');
end

if ~isfolder(idridImageDir) || ~isfile(idridCSV)
    fprintf('[NOTE] IDRiD dataset directory or CSV not currently present.\n');
    fprintf('  Specified image dir: %s\n', idridImageDir);
    fprintf('  Specified CSV path : %s\n', idridCSV);
    fprintf('  This script is ready to evaluate IDRiD whenever the dataset is provided.\n');
    return;
end

fprintf('Evaluating frozen ResNet-50 Ordinal model on IDRiD...\n');
T = readtable(idridCSV);
N = height(T);
predGrades = zeros(N, 1);

for i = 1:N
    imgName = string(T.image{i});
    imgP = fullfile(idridImageDir, imgName);
    res = run_Grading_ResNetOrdinal_Experimental(imgP);
    predGrades(i) = res.predictedGrade;
end

trueGrades = T.DR_grade;
acc = mean(predGrades == trueGrades);
fprintf('IDRiD Evaluation Completed (%d images). Accuracy: %.2f%%\n', N, 100*acc);

end
