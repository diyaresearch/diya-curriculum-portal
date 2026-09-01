/**
 * envValidator.js — env var presence/format checks (issue #361).
 *
 * DATABASE_SCHEMA_QUALIFIER="" is a legitimate development value (see
 * schemaQualifier.js, #427). validateEnvironment() must not report it
 * "missing" just because it's falsy — that regressed every dev boot into
 * printing a spurious warning once #427 switched the dev qualifier to "".
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

describe("DATABASE_SCHEMA_QUALIFIER", () => {
  test("an empty string in development is NOT reported missing", () => {
    withEnv({
      NODE_ENV: "development",
      PORT: "3001",
      SERVER_ALLOW_ORIGIN: "http://localhost:3000",
      DATABASE_SCHEMA_QUALIFIER: "",
    });
    const { validateEnvironment } = load();
    const result = validateEnvironment();
    expect(result.missing).not.toContain("DATABASE_SCHEMA_QUALIFIER");
  });

  test("an unset variable IS reported missing", () => {
    withEnv({
      NODE_ENV: "development",
      PORT: "3001",
      SERVER_ALLOW_ORIGIN: "http://localhost:3000",
      DATABASE_SCHEMA_QUALIFIER: undefined,
    });
    const { validateEnvironment } = load();
    const result = validateEnvironment();
    expect(result.missing).toContain("DATABASE_SCHEMA_QUALIFIER");
  });

  test("a set, non-empty value in production is NOT reported missing", () => {
    withEnv({
      NODE_ENV: "production",
      PORT: "3001",
      SERVER_ALLOW_ORIGIN: "https://example.com",
      DATABASE_SCHEMA_QUALIFIER: "prod.",
      STRIPE_SECRET_KEY: "sk_live_x",
      FIREBASE_PROJECT_ID: "proj",
    });
    const { validateEnvironment } = load();
    const result = validateEnvironment();
    expect(result.missing).not.toContain("DATABASE_SCHEMA_QUALIFIER");
    expect(result.success).toBe(true);
  });

  test("the literal string \"undefined\" is still reported missing", () => {
    withEnv({
      NODE_ENV: "development",
      PORT: "3001",
      SERVER_ALLOW_ORIGIN: "http://localhost:3000",
      DATABASE_SCHEMA_QUALIFIER: "undefined",
    });
    const { validateEnvironment } = load();
    const result = validateEnvironment();
    expect(result.missing).toContain(
      'DATABASE_SCHEMA_QUALIFIER (currently set to "undefined")'
    );
  });

  test("the missing-variable suggestion names the current, not the retired, convention", () => {
    withEnv({
      NODE_ENV: "production",
      PORT: "3001",
      SERVER_ALLOW_ORIGIN: "https://example.com",
      DATABASE_SCHEMA_QUALIFIER: undefined,
      STRIPE_SECRET_KEY: "sk_live_x",
      FIREBASE_PROJECT_ID: "proj",
    });
    const { validateEnvironment } = load();
    const result = validateEnvironment();
    const suggestion = result.suggestions.find((s) =>
      s.includes("DATABASE_SCHEMA_QUALIFIER")
    );
    expect(suggestion).toBeDefined();
    expect(suggestion).toContain('"prod."');
    // The pre-#427 convention this used to suggest — must not resurface.
    expect(suggestion).not.toContain("production_");
  });
});

describe("other required variables", () => {
  test("an empty string for a non-qualifier variable is still reported missing", () => {
    withEnv({
      NODE_ENV: "development",
      PORT: "",
      SERVER_ALLOW_ORIGIN: "http://localhost:3000",
      DATABASE_SCHEMA_QUALIFIER: "",
    });
    const { validateEnvironment } = load();
    const result = validateEnvironment();
    expect(result.missing).toContain("PORT");
  });
});
