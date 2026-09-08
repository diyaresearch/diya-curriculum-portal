/**
 * One client Firebase app, reached one way (issue #362).
 *
 * Firestore and Storage handles used to be obtained three different ways:
 * `getFirestore(firebaseApp)`, a bare `getFirestore()`, and the `db` export
 * from firebaseConfig. The first two return the same default app, so nothing
 * was visibly broken — but a module that called `getFirestore()` without
 * importing firebaseConfig only worked because some *other* module had
 * imported it first and initialized the app, and the emulator wiring (#428)
 * lives on the instances this module exports.
 *
 * `getAuth()` is deliberately not covered here. It stays legal in
 * `utils/apiClient.js` and `auth/googleAuth.js`, and the rule that keeps it
 * out of components is a different one (#368: read auth state from
 * AuthProvider, not from the SDK) — see CLAUDE.md.
 */

import { vi } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

// Vitest runs from portal-app/ (where vite.config.js lives). import.meta.url
// is not a file: URL under the jsdom environment, so it cannot be used here.
const SRC = join(process.cwd(), "src");
const CONFIG = join("firebase", "firebaseConfig.js");

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sourceFiles(full);
    return /\.(js|jsx)$/.test(entry.name) ? [full] : [];
  });
}

/** Comments describe these calls in several files; only real calls count. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function callersOf(pattern) {
  return sourceFiles(SRC)
    .filter((file) => pattern.test(stripComments(readFileSync(file, "utf8"))))
    .map((file) => relative(SRC, file));
}

test("initializeApp() is called in exactly one module", () => {
  expect(callersOf(/initializeApp\s*\(/)).toEqual([CONFIG]);
});

test("Firestore and Storage handles come from that module's exports", () => {
  expect(callersOf(/getFirestore\s*\(/)).toEqual([CONFIG]);
  expect(callersOf(/getStorage\s*\(/)).toEqual([CONFIG]);
});

test("a missing VITE_FIREBASE_* key is reported by name, not left to fail later", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubEnv("VITE_FIREBASE_API_KEY", "");
  vi.resetModules();

  // Under MODE=test this warns instead of throwing: CI has no .env file, and
  // failing every import there would say nothing about the test that failed.
  // Any other mode throws the same message before the app renders.
  await import("@/firebase/firebaseConfig");

  expect(warn).toHaveBeenCalled();
  expect(String(warn.mock.calls[0][0])).toContain("VITE_FIREBASE_API_KEY");

  vi.unstubAllEnvs();
  warn.mockRestore();
});
