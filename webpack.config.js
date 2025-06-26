const createExpoWebpackConfigAsync = require("@expo/webpack-config");

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyDisableDefaultRuleForDependencies: true,
      },
    },
    argv
  );

  // Web環境でreact-native-mapsを無効化
  config.resolve.alias = {
    ...config.resolve.alias,
    "react-native-maps": false,
  };

  // react-native-mapsに関連するモジュールを無視
  config.module.rules.push({
    test: /react-native-maps/,
    use: "null-loader",
  });

  return config;
};
