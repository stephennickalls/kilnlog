// eslint.config.mjs
//
// Flat ESLint config for KilnMonitor.
//
// IMPORTANT — why component-undefined checking is OFF here:
//   This app auto-imports ALL components (Nuxt's app/components/ registration).
//   No .vue file explicitly imports its child components. ESLint's
//   vue/no-undef-components rule works by looking for explicit imports, so on an
//   auto-import codebase it flags EVERY component — NuxtLink, FiringStatsBar,
//   StepBadge, etc. — as "undefined." Those are false positives, not bugs.
//   The correct tool for catching a genuinely-missing auto-imported component is
//   `nuxt typecheck` (see the "typecheck" script in package.json), which reads
//   Nuxt's generated types and CAN tell a real missing component from an
//   auto-imported one. ESLint here is scoped to plain-JS correctness + style.
//
// Run:  npm run lint        (report everything)
//       npm run lint:fix    (autofix safe issues — fixes most style warnings)
//       npm run check       (lint; fails only on errors, not warnings)

import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // ── OFF — false positives on an auto-import codebase ───────────────────
    'vue/no-undef-components': 'off',   // use `nuxt typecheck` instead
    'vue/no-undef-properties': 'off',   // noisy on untyped JS; typecheck covers it

    // ── ERRORS — real plain-JS correctness, low false-positive ─────────────
    'no-undef': 'error',                // genuinely undefined identifier in <script>
    'vue/no-unused-components': 'error', // component imported/registered but unused

    // ── WARNINGS — smells worth seeing, not worth blocking a deploy ────────
    'no-empty': ['warn', { allowEmptyCatch: false }],  // empty catch {} = silent error swallow
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

    // ── OFF — duplicate of no-unused-vars, fires because the Nuxt base config
    //    applies TS rules to .js files. We only want the one (warning) version.
    '@typescript-eslint/no-unused-vars': 'off',

    // ── Cosmetic Vue style — warnings only, almost all --fix-able ──────────
    'vue/multi-word-component-names': 'off',
    'vue/html-self-closing': 'warn',
    'vue/first-attribute-linebreak': 'warn',
    'vue/attributes-order': 'warn',
    'vue/no-v-html': 'warn',
    'vue/require-default-prop': 'off',
  },
})
