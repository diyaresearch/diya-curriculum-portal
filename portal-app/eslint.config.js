import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import testingLibrary from "eslint-plugin-testing-library";

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
  {
    files: ["**/*.{js,jsx}"],
    rules: {
      // The plugin's flat/recommended preset above brings the full React
      // Compiler rule set (set-state-in-effect, immutability,
      // static-components, ...) on top of the two rules CRA's `react-app`
      // config enforced. It is on as errors, which means new code is held to
      // it. The 34 sites that already violated it when the rules went on
      // carry a targeted eslint-disable pointing at #525 - the ratchet stops
      // the count growing while that backlog is worked down deliberately,
      // rather than rewriting state logic across 18 files in one pass.
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
    files: ["src/**/*.{test,spec}.{js,jsx}", "src/setupTests.js"],
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
