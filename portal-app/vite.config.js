import { fileURLToPath, URL } from "node:url";

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
  resolve: {
    // Absolute imports (#358). "@/components/Navbar" instead of counting
    // "../../" hops, so moving a file only rewrites that file's own imports
    // and not every import OF it.
    //
    // The "@/" prefix rather than CRA's bare `baseUrl: "src"` style
    // ("components/Navbar"): a bare specifier is ambiguous with an npm
    // package of the same name, and this app has directories called
    // components, utils, hooks and constants - all plausible package names.
    // The prefix can never collide.
    //
    // tsconfig.json mirrors this for editors and `npm run typecheck`
    // (it replaced jsconfig.json in #365); keep the two in sync.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "build",
    assetsDir: "static",
    // No production sourcemaps. CRA emitted them by default, so they were
    // publicly served off Hosting for as long as this app has been deployed
    // (~8 MB of readable source at /static/*.js.map). Turned off with the
    // Vite migration (#503) rather than carried forward - nothing here needs
    // them in production, and `npm run preview` still builds locally if a
    // production-mode stack trace ever needs decoding.
    sourcemap: false,
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
    // Replaces the "proxy" field CRA read out of package.json: forwards /api
    // to the local backend during `npm start`. Since #439 that is the whole
    // API, payments included - `npm start` in functions/ serves all of it on
    // 3001. Payment calls used to bypass this proxy and go straight to the
    // deployed Cloud Function, because that was a different backend.
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    // Match CRA/Jest's default test discovery (src/**/*.test.*), not
    // Vitest's repo-wide default. ts/tsx are here so a test written
    // alongside a converted module is actually picked up (#365).
    include: ["src/**/*.{test,spec}.{js,jsx,ts,tsx}"],
  },
});
