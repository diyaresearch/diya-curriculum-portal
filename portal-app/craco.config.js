const path = require("path");

module.exports = {
  style: {
    postcss: {
      // Delegate to postcss.config.js entirely, rather than trying to
      // concatenate onto CRA's built-in postcss-preset-env/autoprefixer
      // pipeline (craco's default "extend" mode) — Tailwind v4's PostCSS
      // plugin handles its own vendor-prefixing internally.
      mode: "file",
    },
  },
  jest: {
    configure: (jestConfig) => {
      // react-scripts v5 bundles Jest 27, which predates package.json
      // "exports" map support entirely — Jest's resolver never populates
      // `options.conditions`, so even an exports-aware custom resolver
      // (tried: jest-node-exports-resolver) can't walk react-router's
      // conditional "./dom" export and silently falls through. Mapping
      // the bare specifier straight to the concrete file sidesteps
      // exports resolution altogether. Points at the same file Node's
      // own "node"/"default" condition resolves to.
      jestConfig.moduleNameMapper = {
        ...jestConfig.moduleNameMapper,
        "^react-router/dom$": path.join(
          path.dirname(require.resolve("react-router/package.json")),
          "dist/development/dom-export.js"
        ),
      };
      return jestConfig;
    },
  },
};
