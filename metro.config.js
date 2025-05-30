const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Web環境でreact-native-mapsを除外
const webResolver = {
  ...config.resolver,
  resolverMainFields: ['browser', 'main'],
  platforms: [...config.resolver.platforms, 'web'],
  alias: {
    ...(config.resolver.alias || {}),
    // Web環境ではreact-native-mapsを空のモジュールに置き換え
    'react-native-maps': require.resolve('./web-stubs/react-native-maps.js'),
  },
};

// プラットフォーム別の設定
if (process.env.EXPO_PLATFORM === 'web') {
  config.resolver = webResolver;
}

module.exports = config;
