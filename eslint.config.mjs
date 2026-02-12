import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import promisePlugin from 'eslint-plugin-promise';
import regexpPlugin from 'eslint-plugin-regexp';
import securityPlugin from 'eslint-plugin-security';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.vite/**',
      '**/*.d.ts',
      'eslint.config.mjs'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      import: importPlugin,
      promise: promisePlugin,
      regexp: regexpPlugin,
      security: securityPlugin
    },
    settings: {
      'import/resolver': {
        typescript: true
      }
    },
    rules: {
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
            'object',
            'type'
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true }
        }
      ],
      'import/no-duplicates': 'error',
      'import/no-cycle': 'error',
      'import/no-relative-packages': 'error',
      'import/no-useless-path-segments': [
        'warn',
        {
          noUselessIndex: false
        }
      ],
      'import/newline-after-import': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unsafe-enum-comparison': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/explicit-module-boundary-types': [
        'warn',
        {
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
          allowTypedFunctionExpressions: true
        }
      ],
      '@typescript-eslint/no-duplicate-type-constituents': 'error',
      '@typescript-eslint/unified-signatures': 'error',
      'promise/no-return-wrap': 'error',
      'promise/prefer-await-to-then': 'error',
      'promise/no-promise-in-callback': 'error',
      'security/detect-object-injection': 'error',
      'security/detect-unsafe-regex': 'error',
      'regexp/no-dupe-disjunctions': 'error',
      'regexp/no-empty-alternative': 'error'
    }
  },
  {
    files: ['apps/api/src/services/enexParserService.ts'],
    rules: {
      'security/detect-unsafe-regex': 'off'
    }
  },
  {
    files: ['apps/api/vitest.config.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ['./apps/api/tsconfig.vitest.json'],
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }]
    }
  },
  {
    files: ['**/*.{test,spec,vitest}.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.vitest
      }
    }
  }
);
