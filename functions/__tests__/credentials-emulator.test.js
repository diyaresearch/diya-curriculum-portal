/**
 * Firestore emulator credential resolution (issue #428, safe-prep slice).
 *
 * admin.initializeApp() treats `'credential' in options` as "present" even
 * when the value is undefined/null — so the emulator branch must produce an
 * options object with the key genuinely absent, not set to a falsy value,
 * or every local `--emulator` boot throws INVALID_APP_OPTIONS instead of
 * connecting with no cloud credentials.
 */

const ORIGINAL_ENV = { ...process.env };

function load() {
  jest.resetModules();
  return require("../config/credentials");
}

function withEnv(env) {
  process.env = { ...ORIGINAL_ENV, ...env };
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
  }
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("FIRESTORE_EMULATOR_HOST", () => {
  test("resolveCredential() reports the emulator source, not an error", () => {
    withEnv({ FIRESTORE_EMULATOR_HOST: "localhost:8080" });
    const { resolveCredential } = load();
    const resolved = resolveCredential();
    expect(resolved.source).toBe("firestore-emulator");
  });

  test("takes precedence over a real credential source also being configured", () => {
    // A developer who ran `gcloud auth application-default login` for real
    // Firestore access must still be routed to the emulator, not production.
    withEnv({
      FIRESTORE_EMULATOR_HOST: "localhost:8080",
      FIREBASE_SERVICE_ACCOUNT: JSON.stringify({
        project_id: "fake-project",
        client_email: "x@example.com",
        private_key:
          "-----BEGIN PRIVATE KEY-----\nZmFrZQ==\n-----END PRIVATE KEY-----\n",
      }),
    });
    const { resolveCredential } = load();
    expect(resolveCredential().source).toBe("firestore-emulator");
  });

  test("credentialOptions() omits the credential key entirely for the emulator source", () => {
    withEnv({ FIRESTORE_EMULATOR_HOST: "localhost:8080" });
    const { resolveCredential, credentialOptions } = load();
    const options = credentialOptions(resolveCredential());
    expect("credential" in options).toBe(false);
  });

  test("credentialOptions() still includes a real credential for non-emulator sources", () => {
    const { credentialOptions } = load();
    const resolved = { source: "application-default", credential: { fake: "cert" } };
    const options = credentialOptions(resolved);
    expect("credential" in options).toBe(true);
    expect(options.credential).toBe(resolved.credential);
  });

  test("hasCredentialSource() is true from FIRESTORE_EMULATOR_HOST alone, with nothing else configured", () => {
    withEnv({
      FIRESTORE_EMULATOR_HOST: "localhost:8080",
      FIREBASE_SERVICE_ACCOUNT: undefined,
      GOOGLE_APPLICATION_CREDENTIALS: undefined,
    });
    const { hasCredentialSource } = load();
    expect(hasCredentialSource()).toBe(true);
  });
});
