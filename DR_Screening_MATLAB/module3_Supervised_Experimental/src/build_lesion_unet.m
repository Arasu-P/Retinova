function net = build_lesion_unet(inputSize, numClasses)
% BUILD_LESION_UNET
% Creates a 4-channel Multi-Head U-Net architecture for sub-pixel retinal lesion segmentation
% Input:  inputSize = [512, 512, 3]
% Output: dlnetwork with 4 sigmoid heads [1: MA, 2: HE, 3: EX, 4: SE]

if nargin < 1, inputSize = [512 512 3]; end
if nargin < 2, numClasses = 4; end

layers = [
    imageInputLayer(inputSize, 'Name', 'input', 'Normalization', 'none')
    
    % Level 1 (512x512 -> 32 filters)
    convolution2dLayer(3, 32, 'Padding', 'same', 'Name', 'enc1_conv1')
    batchNormalizationLayer('Name', 'enc1_bn1')
    reluLayer('Name', 'enc1_relu1')
    convolution2dLayer(3, 32, 'Padding', 'same', 'Name', 'enc1_conv2')
    batchNormalizationLayer('Name', 'enc1_bn2')
    reluLayer('Name', 'enc1_relu2')
    maxPooling2dLayer(2, 'Stride', 2, 'Name', 'pool1') % -> 256x256
    
    % Level 2 (256x256 -> 64 filters)
    convolution2dLayer(3, 64, 'Padding', 'same', 'Name', 'enc2_conv1')
    batchNormalizationLayer('Name', 'enc2_bn1')
    reluLayer('Name', 'enc2_relu1')
    convolution2dLayer(3, 64, 'Padding', 'same', 'Name', 'enc2_conv2')
    batchNormalizationLayer('Name', 'enc2_bn2')
    reluLayer('Name', 'enc2_relu2')
    maxPooling2dLayer(2, 'Stride', 2, 'Name', 'pool2') % -> 128x128
    
    % Level 3 (128x128 -> 128 filters)
    convolution2dLayer(3, 128, 'Padding', 'same', 'Name', 'enc3_conv1')
    batchNormalizationLayer('Name', 'enc3_bn1')
    reluLayer('Name', 'enc3_relu1')
    convolution2dLayer(3, 128, 'Padding', 'same', 'Name', 'enc3_conv2')
    batchNormalizationLayer('Name', 'enc3_bn2')
    reluLayer('Name', 'enc3_relu2')
    maxPooling2dLayer(2, 'Stride', 2, 'Name', 'pool3') % -> 64x64
    
    % Level 4 (64x64 -> 256 filters)
    convolution2dLayer(3, 256, 'Padding', 'same', 'Name', 'enc4_conv1')
    batchNormalizationLayer('Name', 'enc4_bn1')
    reluLayer('Name', 'enc4_relu1')
    convolution2dLayer(3, 256, 'Padding', 'same', 'Name', 'enc4_conv2')
    batchNormalizationLayer('Name', 'enc4_bn2')
    reluLayer('Name', 'enc4_relu2')
    maxPooling2dLayer(2, 'Stride', 2, 'Name', 'pool4') % -> 32x32
    
    % Bottleneck (32x32 -> 512 filters)
    convolution2dLayer(3, 512, 'Padding', 'same', 'Name', 'bottleneck_conv1')
    batchNormalizationLayer('Name', 'bottleneck_bn1')
    reluLayer('Name', 'bottleneck_relu1')
    convolution2dLayer(3, 512, 'Padding', 'same', 'Name', 'bottleneck_conv2')
    batchNormalizationLayer('Name', 'bottleneck_bn2')
    reluLayer('Name', 'bottleneck_relu2')
    dropoutLayer(0.3, 'Name', 'bottleneck_drop')
    
    % Decoder Level 4 (32x32 -> 64x64)
    transposedConv2dLayer(2, 256, 'Stride', 2, 'Name', 'upconv4')
    concatenationLayer(3, 2, 'Name', 'cat4')
    convolution2dLayer(3, 256, 'Padding', 'same', 'Name', 'dec4_conv1')
    batchNormalizationLayer('Name', 'dec4_bn1')
    reluLayer('Name', 'dec4_relu1')
    convolution2dLayer(3, 256, 'Padding', 'same', 'Name', 'dec4_conv2')
    batchNormalizationLayer('Name', 'dec4_bn2')
    reluLayer('Name', 'dec4_relu2')
    
    % Decoder Level 3 (64x64 -> 128x128)
    transposedConv2dLayer(2, 128, 'Stride', 2, 'Name', 'upconv3')
    concatenationLayer(3, 2, 'Name', 'cat3')
    convolution2dLayer(3, 128, 'Padding', 'same', 'Name', 'dec3_conv1')
    batchNormalizationLayer('Name', 'dec3_bn1')
    reluLayer('Name', 'dec3_relu1')
    convolution2dLayer(3, 128, 'Padding', 'same', 'Name', 'dec3_conv2')
    batchNormalizationLayer('Name', 'dec3_bn2')
    reluLayer('Name', 'dec3_relu2')
    
    % Decoder Level 2 (128x128 -> 256x256)
    transposedConv2dLayer(2, 64, 'Stride', 2, 'Name', 'upconv2')
    concatenationLayer(3, 2, 'Name', 'cat2')
    convolution2dLayer(3, 64, 'Padding', 'same', 'Name', 'dec2_conv1')
    batchNormalizationLayer('Name', 'dec2_bn1')
    reluLayer('Name', 'dec2_relu1')
    convolution2dLayer(3, 64, 'Padding', 'same', 'Name', 'dec2_conv2')
    batchNormalizationLayer('Name', 'dec2_bn2')
    reluLayer('Name', 'dec2_relu2')
    
    % Decoder Level 1 (256x256 -> 512x512)
    transposedConv2dLayer(2, 32, 'Stride', 2, 'Name', 'upconv1')
    concatenationLayer(3, 2, 'Name', 'cat1')
    convolution2dLayer(3, 32, 'Padding', 'same', 'Name', 'dec1_conv1')
    batchNormalizationLayer('Name', 'dec1_bn1')
    reluLayer('Name', 'dec1_relu1')
    convolution2dLayer(3, 32, 'Padding', 'same', 'Name', 'dec1_conv2')
    batchNormalizationLayer('Name', 'dec1_bn2')
    reluLayer('Name', 'dec1_relu2')
    
    % Multi-Head Output: 4 channels (MA, HE, EX, SE)
    convolution2dLayer(1, numClasses, 'Name', 'final_conv')
    sigmoidLayer('Name', 'sigmoid_out')
];

lgraph = layerGraph(layers);

% Add skip connections
lgraph = connectLayers(lgraph, 'enc4_relu2', 'cat4/in2');
lgraph = connectLayers(lgraph, 'enc3_relu2', 'cat3/in2');
lgraph = connectLayers(lgraph, 'enc2_relu2', 'cat2/in2');
lgraph = connectLayers(lgraph, 'enc1_relu2', 'cat1/in2');

net = dlnetwork(lgraph);
end
