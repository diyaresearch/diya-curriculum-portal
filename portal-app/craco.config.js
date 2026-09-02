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
};
