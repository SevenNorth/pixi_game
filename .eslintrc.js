module.exports = {
  root: true,
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  globals: {},
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 10,
    sourceType: 'module',
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    'semi': [2, 'always'], //语句强制分号结尾
    indent: ['error', 2],
    quotes: ['error', 'single'],
    'linebreak-style': ['error', 'unix'],
    '@typescript-eslint/no-unused-vars': 0,
    'comma-dangle': ['error', 'always-multiline'],
  },
  plugins: ['@typescript-eslint'],
};
