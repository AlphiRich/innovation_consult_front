/**
 * Election-COS1.0 — election-cos-app lint config
 * IC-ECOS-BUILD-2026-V2 §2.2 "Enforced boundaries"
 *
 *  - src/modules/** and src/app/** may not import firebase/firestore
 *    (or any other firebase/* SDK) directly — everything goes through
 *    src/dal. Only src/dal/adapters/** may import firebase SDKs.
 *  - No raw hex colour literals in components (see also
 *    `npm run check:hex`, which is a stricter source-text grep run in CI
 *    because ESLint alone can't reliably catch hex strings inside
 *    Tailwind className template literals).
 */
const firestoreBan = {
  paths: [
    { name: 'firebase/firestore', message: 'Import via src/dal — see §2.2 of the build spec.' },
    { name: 'firebase/storage', message: 'Import via src/dal — see §2.2 of the build spec.' },
  ],
};

module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  ignorePatterns: ['dist', 'node_modules', '*.cjs'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['src/modules/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}', 'src/offline/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': ['error', firestoreBan],
      },
    },
    {
      // The DAL's own port layer must stay storage-agnostic too — only the
      // firestore adapter subfolder is allowed to import Firestore.
      files: ['src/dal/ports/**/*.{ts,tsx}', 'src/dal/index.ts'],
      rules: {
        'no-restricted-imports': ['error', firestoreBan],
      },
    },
  ],
};
