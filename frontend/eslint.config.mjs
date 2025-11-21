import nextPlugin from '@next/eslint-plugin-next';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import * as importPlugin from 'eslint-plugin-import';

const config = [
  {
    files: ['backend/src/**/*.{js,ts,tsx,jsx}', 'frontend/src/**/*.{js,ts,tsx,jsx}'],
  },
  {
    ignores: [
      '**/eslint.config.mjs',
      '**/prettier.config.js',
      '**/next.config.mjs',
      '**/next.config.ts',
      '**/tailwind.config.ts',
      '**/tsconfig.json',
      '**/postcss.config.mjs',
      '**/next-env.d.ts',
      '**/build/',
      '**/bin/',
      '**/obj/',
      '**/out/',
      '**/.next/',
      '**/.vscode/',
      'src/components/ui/**/*.{js,ts,tsx}',
    ],
  },
  {
    name: 'eslint/recommended',
    rules: js.configs.recommended.rules,
  },
  ...tseslint.configs.recommended,
  {
    name: 'react/jsx-runtime',
    plugins: {
      react: reactPlugin,
    },
    rules: reactPlugin.configs['jsx-runtime'].rules,
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    name: 'react-hooks/recommended',
    plugins: {
      'react-hooks': hooksPlugin,
    },
    rules: hooksPlugin.configs.recommended.rules,
  },
  {
    name: 'next/core-web-vitals',
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
  {
    name: 'prettier/config',
    ...eslintConfigPrettier,
  },
  {
    name: 'project-custom',
    rules: {
      '@typescript-eslint/no-unused-vars': 1,
    },
  },
  {
    plugins: { import: importPlugin },
    rules: {
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling'], 'index', 'object', 'type'],
          pathGroups: [
            {
              pattern: '@/**',
              group: 'internal',
            },
          ],
          'newlines-between': 'always',
        },
      ],
    },
  },
  {
    name: 'test-files',
    files: ['**/tests/**/*.{ts,tsx,js,jsx}', '**/*.test.{ts,tsx,js,jsx}', '**/*.spec.{ts,tsx,js,jsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // anyを許可
      '@typescript-eslint/no-unused-vars': 'off', // 未使用変数を許可
      'import/order': 'off', // import/orderを無効化
      'no-console': 'off', // console.logを許可
    },
  },
];

export default config;
