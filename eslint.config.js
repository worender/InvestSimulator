const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expo,
  {
    files: ['backend/**/*.js', '*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  { ignores: ['dist/*'] },
]);