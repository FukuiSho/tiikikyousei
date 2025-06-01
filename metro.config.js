const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// ネイティブ専用設定（Android/iOS）
config.resolver.platforms = ['ios', 'android', 'native'];

module.exports = config;
