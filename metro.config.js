const { getDefaultConfig } = require("@expo/metro-config");

const config = getDefaultConfig(__dirname);

// プラットフォーム設定
config.resolver.platforms = ["web", "ios", "android", "native"];

// Web環境での設定
if (process.env.EXPO_PLATFORM === "web") {
  config.resolver.alias = {
    ...(config.resolver.alias || {}),
    "react-native-maps": false, // Web環境では無効化
  };
}

module.exports = config;
