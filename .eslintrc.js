/* eslint-env node */
module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  ignorePatterns: ["__tests__", "__mocks__", "lib", "e2e", "harness"],
  root: true,
  rules: {
    "@typescript-eslint/no-var-requires": "off",
  }
};
