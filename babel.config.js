module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Expo SDK 54 + Reanimated v4 uses worklets plugin
    plugins: ['react-native-worklets/plugin'],
  };
};

