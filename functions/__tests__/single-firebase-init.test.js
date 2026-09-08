/**
 * One Firebase Admin initialization, one credential (issue #362).
 *
 * routes/payment.js and routes/stripeWebhook.js each used to call a bare
 * `admin.initializeApp()`. The Admin SDK keeps a single default app, so
 * whichever module happened to run first decided the credential for the whole
 * process — and a bare call skips config/credentials.js entirely. With
 * FIRESTORE_EMULATOR_HOST or FIREBASE_SERVICE_ACCOUNT set, a request that
 * landed on the webhook first could silently bind the process to a different
 * identity than the one every other route resolved.
 *
 * This scans source rather than behaviour because the failure only shows up
 * as an ordering accident at runtime, which no single unit test would catch.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SKIP_DIRS = new Set(["node_modules", "__tests__", ".git", "coverage"]);
const CANONICAL = path.join("config", "firebaseConfig.js");

/** Comments discuss initializeApp() in several modules; only real calls count. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.name.endsWith(".js") ? [full] : [];
  });
}

test("admin.initializeApp() is called in exactly one module", () => {
  const callers = sourceFiles(ROOT)
    .filter((file) => /initializeApp\s*\(/.test(stripComments(fs.readFileSync(file, "utf8"))))
    .map((file) => path.relative(ROOT, file));

  expect(callers).toEqual([CANONICAL]);
});

test("the canonical module initializes through the shared credential resolver", () => {
  const source = fs.readFileSync(path.join(ROOT, CANONICAL), "utf8");

  // Not a bare initializeApp(): the options must come from credentials.js,
  // which is what enforces the emulator / service-account precedence.
  expect(source).toMatch(/credentialOptions\(resolved\)/);
  expect(source).toMatch(/require\("\.\/credentials"\)/);
});
