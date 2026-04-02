const tseslint = require('typescript-eslint');
const eslintPluginPrettier = require('eslint-plugin-prettier/recommended');

module.exports = [
  ...tseslint.configs.recommended,
  eslintPluginPrettier,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-duplicate-enum-values': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'webpack/', '*.config.js'],
  },
];
