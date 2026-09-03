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

      // react-quill-new (the React 19-compatible fork swapped in after
      // react-quill was abandoned - unmaintained since 2023, peer-capped at
      // React 18) ships as an ES module, and so do its own dependencies
      // quill, parchment, and lodash-es. CRA's default
      // transformIgnorePatterns excludes all of node_modules from Babel's
      // transform, so Jest can't parse their `import`/`export` syntax -
      // carve out an exception for exactly these four instead of the
      // (much riskier) alternative of disabling transformIgnorePatterns
      // wholesale.
      jestConfig.transformIgnorePatterns = jestConfig.transformIgnorePatterns.map(
        (pattern) =>
          pattern.includes("node_modules")
            ? pattern.replace(
                "node_modules[/\\\\]",
                "node_modules[/\\\\](?!(react-quill-new|quill|parchment|lodash-es)[/\\\\])"
              )
            : pattern
      );

      return jestConfig;
    },
  },
};
