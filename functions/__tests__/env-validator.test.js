/**
 * envValidator.js — env var presence/format checks (issue #361).
 */

const ORIGINAL_ENV = { ...process.env };

function load() {
  jest.resetModules();
  return require("../utils/envValidator");
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

describe("required variables", () => {
  test("an empty string for a required variable is reported missing", () => {
    withEnv({
      NODE_ENV: "development",
      PORT: "",
      SERVER_ALLOW_ORIGIN: "http://localhost:3000",
    });
    const { validateEnvironment } = load();
    const result = validateEnvironment();
    expect(result.missing).toContain("PORT");
  });

  test("all required development variables present is a success", () => {
    withEnv({
      NODE_ENV: "development",
      PORT: "3001",
      SERVER_ALLOW_ORIGIN: "http://localhost:3000",
    });
    const { validateEnvironment } = load();
    const result = validateEnvironment();
    expect(result.success).toBe(true);
    expect(result.missing).toEqual([]);
  });

  test("production requires STRIPE_SECRET_KEY and FIREBASE_PROJECT_ID", () => {
    withEnv({
      NODE_ENV: "production",
      PORT: "3001",
      SERVER_ALLOW_ORIGIN: "https://example.com",
      STRIPE_SECRET_KEY: undefined,
      FIREBASE_PROJECT_ID: undefined,
    });
    const { validateEnvironment } = load();
    const result = validateEnvironment();
    expect(result.missing).toContain("STRIPE_SECRET_KEY");
    expect(result.missing).toContain("FIREBASE_PROJECT_ID");
  });
});
