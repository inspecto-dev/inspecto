import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/out/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.turbo/**',
      'pnpm-lock.yaml',
      'packages/plugin/legacy/rspack/**',
      'packages/plugin/test*.cjs',
      'packages/docs/.vitepress/cache/**',
      'playground/**',
    ],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      // Add other custom rules here
    },
  }
);
