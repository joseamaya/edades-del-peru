import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'review/**', '.agents/**', 'coverage/**', 'public/draco/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': 'off',
      'no-constant-condition': 'off',
    },
  },
  {
    files: ['src/game/**/*.ts', 'src/entities/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use the seeded RNG for simulation state; cosmetics use the dedicated FX RNG.',
        },
      ],
    },
  },
  {
    // Visual-only jitter (smoke, sway, muzzle light) never feeds gameplay state.
    files: ['src/entities/Building.ts', 'src/entities/Projectile.ts', 'src/entities/ResourceNode.ts'],
    rules: { 'no-restricted-properties': 'off' },
  },
  {
    files: ['scripts/**/*.{mjs,ts}', '*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        location: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        performance: 'readonly',
        PerformanceObserver: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        crypto: 'readonly',
        btoa: 'readonly',
        Buffer: 'readonly',
      },
    },
  },
);
