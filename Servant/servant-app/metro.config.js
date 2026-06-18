const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      type: 'sourceFile',
      filePath: require.resolve('./src/lib/react-native-maps.web.stub.tsx'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
