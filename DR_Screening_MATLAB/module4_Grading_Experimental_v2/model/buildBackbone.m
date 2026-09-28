function [backboneNet, featureLayerName] = buildBackbone(cfg)
% BUILDBACKBONE - Builds pretrained ResNet-50 backbone up to global average pooling.

if nargin < 1
    cfg = config();
end

net = resnet50;
lgraph = layerGraph(net);

% Remove final 1000-class layers
lgraph = removeLayers(lgraph, {'fc1000', 'fc1000_softmax', 'ClassificationLayer_fc1000'});

% Replace input layer with 384x384x3 input layer
newInputLayer = imageInputLayer([cfg.inputSize(1) cfg.inputSize(2) cfg.inputSize(3)], ...
    'Name', 'input_1', 'Normalization', 'none');
lgraph = replaceLayer(lgraph, 'input_1', newInputLayer);

featureLayerName = 'activation_49_relu'; % Last residual block ReLU

backboneNet = dlnetwork(lgraph);

end
