/**
 * Collection qualifier resolution (issue #427).
 *
 * The server used "prod_" while the frontend used "prod.". Since prod_*
 * collections were never created, every production API request read and wrote
 * an empty namespace and returned success. These tests pin down the value, and
 * the failure modes that let the mismatch hide.
 */

const ORIGINAL_ENV = { ...process.env };

function load() {
  jest.resetModules();
  return require("../utils/schemaQualifier");
}

function withEnv(env) {
  process.env = { ...ORIGINAL_ENV, ...env };
  // `undefined` in the object means "explicitly unset".
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
  }
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("production", () => {
  test("resolves the qualifier the data actually lives under", () => {
    withEnv({ NODE_ENV: "production", DATABASE_SCHEMA_QUALIFIER: "prod." });
    expect(load().resolveSchemaQualifier()).toBe("prod.");
  });

  test("refuses to resolve when the qualifier is unset", () => {
    withEnv({ NODE_ENV: "production", DATABASE_SCHEMA_QUALIFIER: undefined });
    expect(() => load().resolveSchemaQualifier()).toThrow(/not set/i);
  });

  test('treats the literal string "undefined" as unset', () => {
    // Raw `${process.env.X}` interpolation produced this, which created
    // collections named `undefinedusers`.
    withEnv({ NODE_ENV: "production", DATABASE_SCHEMA_QUALIFIER: "undefined" });
    expect(() => load().resolveSchemaQualifier()).toThrow(/not set/i);
  });

  test("warns loudly when pointed somewhere other than the production namespace", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    withEnv({ NODE_ENV: "production", DATABASE_SCHEMA_QUALIFIER: "prod_" });
    expect(load().resolveSchemaQualifier()).toBe("prod_");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("prod_"));
    warn.mockRestore();
  });
});

describe("development", () => {
  test("an unset qualifier means unprefixed, matching the frontend", () => {
    withEnv({ NODE_ENV: "development", DATABASE_SCHEMA_QUALIFIER: undefined });
    expect(load().resolveSchemaQualifier()).toBe("");
  });

  test("an explicitly empty qualifier is honoured, not treated as missing", () => {
    withEnv({ NODE_ENV: "development", DATABASE_SCHEMA_QUALIFIER: "" });
    expect(load().resolveSchemaQualifier()).toBe("");
  });

  test("an explicit value is used as given", () => {
    withEnv({ NODE_ENV: "development", DATABASE_SCHEMA_QUALIFIER: "dev_" });
    expect(load().resolveSchemaQualifier()).toBe("dev_");
  });
});

describe("rejects values that could reshape a collection path", () => {
  test.each(["../", "prod./../", "a b", "prod.$(x)", "prod/"])(
    "rejects %p",
    (value) => {
      withEnv({ NODE_ENV: "development", DATABASE_SCHEMA_QUALIFIER: value });
      expect(() => load().resolveSchemaQualifier()).toThrow(/unsupported characters/i);
    }
  );

  test("accepts the shapes actually in use", () => {
    for (const value of ["prod.", "dev_", "test_", "prod-1"]) {
      withEnv({ NODE_ENV: "development", DATABASE_SCHEMA_QUALIFIER: value });
      expect(load().resolveSchemaQualifier()).toBe(value);
    }
  });
});

describe("no collection can be named undefined*", () => {
  test("a table name built from the resolver never starts with 'undefined'", () => {
    withEnv({ NODE_ENV: "development", DATABASE_SCHEMA_QUALIFIER: "undefined" });
    const q = load().resolveSchemaQualifier();
    expect(`${q}users`).toBe("users");
    expect(`${q}users`).not.toBe("undefinedusers");
  });
});
