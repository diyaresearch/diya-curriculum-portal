import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Vite replaces react-scripts/CRA + craco (#503). Two of CRA's conventions
// this app actually depended on are reproduced explicitly below rather than
// left to Vite's defaults:
//
//   * build.outDir "build" and build.assetsDir "static" — firebase.json (repo
//     root) serves portal-app/build and caches /static/** immutably. Vite's
//     defaults (dist/, assets/) would silently break both.
//   * base "/" — Firebase Hosting serves this app at the site ROOT. The
//     router basename is /diya-ed, but that is a URL prefix only, not a
//     directory on the host (issue #421), so assets must resolve from /.
//
// Tailwind 4 is wired through its first-party Vite plugin, which replaces the
// postcss.config.js + craco "style.postcss" patch the CRA build needed.
export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "build",
    assetsDir: "static",
    // CRA emitted sourcemaps for production builds by default; keep parity.
    sourcemap: true,
    // package.json's "browserslist" is gone with react-scripts - nothing in
    // this toolchain reads it any more (Tailwind 4 does its own prefixing,
    // and there is no autoprefixer/postcss-preset-env step left). Vite's
    // own default target is what decides downlevelling now; name it here so
    // that is visible rather than implied.
    target: "baseline-widely-available",
  },
  server: {
    // start.sh and VITE_HOME_PAGE both assume 3000, which
    // was CRA's dev port; Vite's own default is 5173.
    port: 3000,
    // Replaces the "proxy" field CRA read out of package.json: forwards the
    // App Engine API (server/) to the local backend during `npm start`.
    // Payments are NOT covered by this — they live in functions/ and are
    // reached directly via src/utils/paymentsApi.js.
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    // Match CRA/Jest's default test discovery (src/**/*.test.*), not
    // Vitest's repo-wide default.
    include: ["src/**/*.{test,spec}.{js,jsx}"],
  },
});
