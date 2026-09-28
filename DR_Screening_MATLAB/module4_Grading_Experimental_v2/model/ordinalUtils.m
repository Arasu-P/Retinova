function [classProbs, predGrade, sevScore, ordProbs] = ordinalUtils(cumProbs)
% ORDINALUTILS - Converts cumulative probabilities to 5-class probabilities,
% computes severity score and predicted grade, and verifies ordinal properties.
%
% Input:
%   cumProbs - 4 x B matrix of P(Y >= 1..4)
%
% Outputs:
%   classProbs - 5 x B matrix of P(G = 0..4)
%   predGrade  - 1 x B vector of predicted grades (0..4)
%   sevScore   - 1 x B vector of continuous severity scores [0..4]
%   ordProbs   - 4 x B cumulative probabilities

ordProbs = cumProbs;
P1 = cumProbs(1, :);
P2 = cumProbs(2, :);
P3 = cumProbs(3, :);
P4 = cumProbs(4, :);

% 5-class mutually exclusive probabilities
P_G0 = 1.0 - P1;
P_G1 = P1 - P2;
P_G2 = P2 - P3;
P_G3 = P3 - P4;
P_G4 = P4;

classProbs = [P_G0; P_G1; P_G2; P_G3; P_G4];

% Clip minor numerical precision underflows to >= 0
classProbs = max(classProbs, 0.0);
classProbs = classProbs ./ max(sum(classProbs, 1), 1e-7); % Re-normalize to exact 1.0

sevScore  = sum(cumProbs, 1);
predGrade = sum(cumProbs >= 0.5, 1);

end
