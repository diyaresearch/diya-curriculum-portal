/**
 * Error response consistency (issue #394).
 *
 * modulesController.js, lessonsController.js, and the units handlers
 * used to leak the raw error.message straight to the client via
 * `res.status(500).send(error.message)` - the same, unconditionally, in
 * every environment, unlike the standardized sendError()/createErrorResponse()
 * pattern already used elsewhere (user.js, payment.js) which only exposes
 * that detail outside production. These tests exercise one representative
 * path per file end-to-end (not mocking the controller itself, the way
 * route-auth.test.js does) to confirm the converted catch blocks actually
 * produce the standard {success, statusCode, error: {code, message}}
 * envelope and don't leak error.message in production.
 */

const express = require("express");
const request = require("supertest");

jest.mock("../services/databaseService", () => ({
  databaseService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    getDb: jest.fn(() => {
      throw new Error("secret internal detail: connection string leaked");
    }),
  },
}));

jest.mock("../utils/ownership", () => ({ canMutate: jest.fn(), resolveOwnerUid: jest.fn() }));
jest.mock("../utils/entitlements.check", () => ({
  canAccessModule: jest.fn(),
  isPaidModule: jest.fn(),
}));

function appFor(router, mountPath = "/") {
  const a = express();
  a.use(express.json());
  a.use(mountPath, router);
  return a;
}

describe("#394 — modulesController error responses", () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test("GET /api/module returns the standard envelope, not a leaked error.message", async () => {
    process.env.NODE_ENV = "development";
    const { getAllModules } = require("../controllers/modulesController");
    const a = express();
    a.get("/api/module", getAllModules);

    const res = await request(a).get("/api/module");

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      success: false,
      statusCode: 500,
      error: { code: "MODULE_FETCH_ERROR", message: "Failed to fetch modules" },
    });
    // Outside production, the underlying detail is still available for debugging.
    expect(res.body.error.details).toBe("secret internal detail: connection string leaked");
  });

  test("the same error hides its detail in production", async () => {
    process.env.NODE_ENV = "production";
    jest.resetModules();
    const { getAllModules } = require("../controllers/modulesController");
    const a = express();
    a.get("/api/module", getAllModules);

    const res = await request(a).get("/api/module");

    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe("Failed to fetch modules");
    expect(res.body.error.details).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain("secret internal detail");
  });
});

// #366 gave the units and lessons controllers the same catch blocks. Both
// used to answer with res.status(500).send(error.message) — the raw driver
// error, in production too. The header above claimed all three files were
// covered; only the module one actually was.
describe("#366 — unitsController error responses", () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test("GET /api/units returns the standard envelope", async () => {
    process.env.NODE_ENV = "development";
    const { getAllUnits } = require("../controllers/unitsController");
    const a = express();
    a.get("/api/units", getAllUnits);

    const res = await request(a).get("/api/units");

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      success: false,
      statusCode: 500,
      error: { code: "UNIT_FETCH_ERROR", message: "Failed to fetch units" },
    });
  });

  test("the same error hides its detail in production", async () => {
    process.env.NODE_ENV = "production";
    jest.resetModules();
    const { getAllUnits } = require("../controllers/unitsController");
    const a = express();
    a.get("/api/units", getAllUnits);

    const res = await request(a).get("/api/units");

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("secret internal detail");
  });
});

describe("#366 — lessonsController error responses", () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test("GET /api/lessons returns the standard envelope", async () => {
    process.env.NODE_ENV = "development";
    const { getAllLessons } = require("../controllers/lessonsController");
    const a = express();
    a.get("/api/lessons", getAllLessons);

    const res = await request(a).get("/api/lessons");

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      success: false,
      statusCode: 500,
      error: { code: "LESSON_FETCH_ERROR", message: "Failed to fetch lessons" },
    });
  });

  test("the same error hides its detail in production", async () => {
    process.env.NODE_ENV = "production";
    jest.resetModules();
    const { getAllLessons } = require("../controllers/lessonsController");
    const a = express();
    a.get("/api/lessons", getAllLessons);

    const res = await request(a).get("/api/lessons");

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("secret internal detail");
  });
});
