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
      '**/generated/',
      '**/dist/',
      '**/node_modules/',
    ],
  },
  {
    name: 'eslint/recommended',
    rules: js.configs.recommended.rules,
  },
  ...tseslint.configs.recommended,
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
      'no-console': 'off', // console.logを許可
    },
  },
];

export default config;
