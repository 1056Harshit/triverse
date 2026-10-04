// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // HTML-entity escaping is a web concern; React Native <Text> renders quotes literally.
      "react/no-unescaped-entities": "off",
    },
  },
]);
