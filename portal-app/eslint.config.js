import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import testingLibrary from "eslint-plugin-testing-library";
import tseslint from "typescript-eslint";

// Replaces CRA's bundled `react-app` / `react-app/jest` shareable configs,
// which shipped inside react-scripts and disappeared with it (#503).
//
// eslint-plugin-react is deliberately NOT here. It was only ever needed for
// `react/jsx-uses-vars` (so a component imported and then used only inside
// JSX doesn't read as an unused variable) — ESLint's own scope analysis
// handles JSX references natively now, and the plugin's published peer range
// still caps out at eslint ^9.7, which would pin this app to an ESLint major
// that no longer gets security fixes. Core + the hooks rules cover what
// `react-app` actually enforced in this codebase.
export default [
  {
    ignores: ["build/**", "node_modules/**", "coverage/**"],
  },
  js.configs.recommended,
  reactHooks.configs.flat.recommended,

  // TypeScript (#365). Scoped to .ts/.tsx so the ~90 remaining .js/.jsx files
  // keep the exact rule set they had - this migration is incremental, and a
  // lint config that changed underneath every file at once would be the
  // opposite of that.
  //
  // `recommended`, not `recommendedTypeChecked`: the type-aware rules need a
  // full program per lint run, which roughly triples lint time, and
  // `npm run typecheck` already runs the compiler over the same files.
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
  })),
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // The TS-aware replacement for the core rule below, with identical
      // options. typescript-eslint's preset turns the core one off, because
      // it cannot see type-only imports or parameter properties.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "none",
          caughtErrors: "none",
          ignoreRestSiblings: true,
          varsIgnorePattern: "^React$",
        },
      ],
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  {
    files: ["**/*.{js,jsx}"],
    rules: {
      // The plugin's flat/recommended preset above brings the full React
      // Compiler rule set (set-state-in-effect, immutability,
      // static-components, ...) on top of the two rules CRA's `react-app`
      // config enforced. It is on as errors, and there are no suppressions
      // left: the 34 sites that violated it when the rules went on were
      // grandfathered behind eslint-disable comments pointing at #525 and
      // have all been worked down (#525 closed; a few disappeared with the
      // dead code removed in #444).
      // exhaustive-deps stays a warning, as it was under `react-app`; lint
      // runs at --max-warnings=0, so it still fails the build.
      "react-hooks/exhaustive-deps": "warn",
      // react-app's options, plus one addition: eslint's own scope analysis
      // resolves JSX references, so a component used only in JSX no longer
      // needs eslint-plugin-react - but a bare `import React from "react"`
      // under the automatic JSX runtime genuinely has no reference, and
      // plenty of files here still carry one. `caughtErrors: "none"` keeps
      // eslint 9's stricter default from flagging unused catch bindings.
      "no-unused-vars": [
        "error",
        {
          args: "none",
          caughtErrors: "none",
          ignoreRestSiblings: true,
          varsIgnorePattern: "^React$",
        },
      ],
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
  },
  {
    // Config files run in Node, not the browser.
    files: ["*.config.js"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ["src/**/*.{test,spec}.{js,jsx,ts,tsx}", "src/setupTests.js"],
    ...testingLibrary.configs["flat/react"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        // Vitest runs with `globals: true` (see vite.config.js).
        ...globals.vitest,
      },
    },
  },
];
