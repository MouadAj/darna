import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {ignores: ['dist/**', 'src/generated/**']},
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {globals: {...globals.node, ...globals.jest}},
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);
