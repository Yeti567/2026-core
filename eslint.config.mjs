import pluginSecurity from 'eslint-plugin-security';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import tsParser from '@typescript-eslint/parser';

export default [
  // Ignore patterns - must come first
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'public/**',
      '*.config.js',
      '*.config.mjs',
      'supabase/**',
      'test/**',
      'scripts/**',
      'components/forms/**',
    ],
  },
  // Security plugin configuration for all TS/TSX files
  {
    name: 'security-rules',
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      security: pluginSecurity,
      'react-hooks': pluginReactHooks,
    },
    rules: {
      'security/detect-eval-with-expression': 'error',
      'security/detect-unsafe-regex': 'error',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-non-literal-require': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-object-injection': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-buffer-noassert': 'warn',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'warn',
      'security/detect-new-buffer': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
