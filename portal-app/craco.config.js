odule.exports = {
  style: {
    css: {
      loader: "postcss-loader",
      options: {
        postcssOptions: {
          plugins: ["tailwindcss"],
        },
      },
    },
  },
};
