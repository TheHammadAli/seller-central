module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Values from .env, imported from '@env' (see .env.example). A changed
    // .env only reaches a release build once the JS bundle is rebuilt.
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true,
      },
    ],
  ],
};
