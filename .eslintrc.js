'use strict';

module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    worker: true,
  },
  globals: {
    // Injected by bundler (Vite/webpack)
    process: 'readonly',
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      presets: ['@babel/preset-react'],
    },
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['react', 'react-hooks', 'jsx-a11y', 'security'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react/prop-types': 'off',
    'no-unused-vars': ['warn', {argsIgnorePattern: '^_', varsIgnorePattern: '^_'}],
    'no-console': 'off',
    // Downgrade to warn: empty catch blocks exist in legacy audio/WebRTC code
    'no-empty': 'warn',
    'jsx-a11y/click-events-have-key-events': 'error',
    'jsx-a11y/no-static-element-interactions': 'error',
    'security/detect-object-injection': 'off',
    'security/detect-non-literal-fs-filename': 'off',
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.test.jsx', 'src/setupTests.js'],
      env: {
        jest: true,
        node: true,
      },
      plugins: ['jest'],
      extends: ['plugin:jest/recommended'],
      rules: {
        'jest/no-focused-tests': 'error',
        'jest/no-disabled-tests': 'warn',
        'jest/expect-expect': 'warn',
      },
    },
    {
      files: ['config/**/*.js', 'scripts/**/*.js'],
      env: {
        node: true,
        browser: false,
      },
      globals: {
        process: 'readonly',
      },
    },
  ],
};
