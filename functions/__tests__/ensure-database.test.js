/**
 * Database readiness is decided once, in the pipeline, not per handler (#396).
 *
 * Every controller and route used to open with `await
 * databaseService.initialize()`. Nothing awaited that promise anywhere it
 * could be handled, so a dead Admin credential surfaced as an unhandled
 * rejection in whichever route ran first and then as
 * "DatabaseService not initialized" from getDb() for every request after it —
 * which reads like a bug in the route rather than a broken credential.
 *
 * app.js now starts initialization at build time and mounts ensureDatabase
 * ahead of the routers. These tests cover both halves: the middleware's own
 * behaviour, and the wiring that decides which routes sit behind it.
 */

const express = require("express");
const request = require("supertest");

const mockInitialize = jest.fn();

jest.mock("../services/databaseService", () => ({
  databaseService: {
    initialize: (...args) => mockInitialize(...args),
    getDb: jest.fn(() => ({ collection: () => ({ get: async () => ({ empty: true }) }) })),
    getAdmin: jest.fn(() => ({})),
  },
}));

// The health route reaches for the real credential machinery; it is not what
// is under test here, and it must stay answerable while the database is down.
jest.mock("../config/firebaseConfig", () => ({ db: {}, storage: {} }));
jest.mock("../config/credentials", () => ({
  verifyCredential: jest.fn(async () => ({ ok: true })),
  resolveCredential: jest.fn(() => ({ source: "test", detail: "test credential" })),
  credentialOptions: jest.fn(() => ({})),
  hasCredentialSource: jest.fn(() => true),
  remediationFor: jest.fn(() => "fix it"),
  isGoogleManagedRuntime: jest.fn(() => false),
  PROJECT_ID: "test-project",
  STORAGE_BUCKET: "test-bucket",
}));

const { ensureDatabase } = require("../middleware/ensureDatabase");

let consoleError;

beforeEach(() => {
  mockInitialize.mockReset();
  mockInitialize.mockResolvedValue(undefined);
  consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("ensureDatabase", () => {
  function appWith(handler) {
    const app = express();
    app.use(ensureDatabase);
    app.get("/thing", handler);
    return app;
  }

  test("runs the handler once initialization resolves", async () => {
    const handler = jest.fn((req, res) => res.json({ ok: true }));
    const res = await request(appWith(handler)).get("/thing");

    expect(res.status).toBe(200);
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalled();
  });

  test("answers 503 and never reaches the handler when initialization fails", async () => {
    mockInitialize.mockRejectedValue(new Error("no credential source configured"));
    const handler = jest.fn((req, res) => res.json({ ok: true }));

    const res = await request(appWith(handler)).get("/thing");

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: "DATABASE_INIT_FAILED", message: "Database initialization failed" },
    });
    // The point of the middleware: the handler cannot run against a service
    // whose getDb() would throw.
    expect(handler).not.toHaveBeenCalled();
  });

  test("a later request recovers once initialization succeeds", async () => {
    mockInitialize.mockRejectedValueOnce(new Error("not ready yet"));
    const handler = jest.fn((req, res) => res.json({ ok: true }));
    const app = appWith(handler);

    expect((await request(app).get("/thing")).status).toBe(503);
    expect((await request(app).get("/thing")).status).toBe(200);
  });
});

describe("app wiring", () => {
  const { buildApp } = require("../app");

  test("initialization starts when the app is built, not on the first request", () => {
    mockInitialize.mockResolvedValue(undefined);
    buildApp();

    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  test("a credential that fails at startup does not stop the app from building", () => {
    mockInitialize.mockRejectedValue(new Error("no credential source configured"));

    // The rejection is caught in buildApp; an uncaught one here would take
    // down a Cloud Functions instance at load time.
    expect(() => buildApp()).not.toThrow();
  });

  test("data routes are behind the gate — 503, not a 500 from getDb()", async () => {
    mockInitialize.mockRejectedValue(new Error("no credential source configured"));

    const res = await request(buildApp()).get("/api/units");

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("DATABASE_INIT_FAILED");
  });

  test("/api/health stays ahead of the gate so it can report the outage", async () => {
    mockInitialize.mockRejectedValue(new Error("no credential source configured"));

    const res = await request(buildApp()).get("/api/health");

    // Whatever it reports, it must be the health route answering and not
    // ensureDatabase short-circuiting it.
    expect(res.body.error?.code).not.toBe("DATABASE_INIT_FAILED");
    expect(res.body).toHaveProperty("firestore");
  });
});
