/**
 * Regression test for issue #425.
 *
 * POST /api/user/register used to read `role` from the request body and write
 * it straight to the user document, validated only against an enum that
 * included "admin". A first-time caller could register themselves as an admin.
 *
 * These tests mount the real router with the database and auth layers stubbed,
 * so they assert the route's own behaviour rather than a live deployment.
 */

const express = require("express");
const request = require("supertest");

const TEST_UID = "attacker-uid";

// Capture what the route writes, so we can assert on the stored role.
let written;
let existingDoc;

jest.mock("../middleware/authenticateUser", () =>
  jest.fn((req, _res, next) => {
    req.user = { uid: "attacker-uid", email: "attacker@example.com" };
    next();
  })
);

jest.mock("../middleware/requireRole", () => ({
  requireAdmin: jest.fn((_req, _res, next) => next()),
  requireValidUser: jest.fn((_req, _res, next) => next()),
}));

jest.mock("../services/databaseService", () => {
  const docRef = {
    get: async () => ({
      exists: Boolean(global.__existingDoc),
      data: () => global.__existingDoc,
    }),
    set: async (data) => {
      global.__written = data;
    },
    update: async (data) => {
      global.__written = { ...(global.__written || {}), ...data };
    },
  };

  return {
    databaseService: {
      initialize: async () => {},
      getDb: () => ({ collection: () => ({ doc: () => docRef }) }),
      getAdmin: () => ({ firestore: { FieldValue: { serverTimestamp: () => "ts" } } }),
      getUserDocument: async () => ({ ref: docRef, snap: { exists: false }, collection: "users" }),
    },
  };
});

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/user", require("../routes/user"));
  return app;
}

const validPayload = {
  email: "attacker@example.com",
  fullName: "Attacker Example",
  firstName: "Attacker",
  lastName: "Example",
};

beforeEach(() => {
  global.__written = undefined;
  global.__existingDoc = undefined;
  written = undefined;
  existingDoc = undefined;
});

describe("#425 — POST /api/user/register ignores client-supplied role", () => {
  test('registering with role "admin" yields teacherDefault', async () => {
    const res = await request(buildApp())
      .post("/api/user/register")
      .send({ ...validPayload, role: "admin" });

    expect(res.status).toBe(201);
    expect(global.__written.role).toBe("teacherDefault");
    expect(res.body.data.role).toBe("teacherDefault");
  });

  test('registering with role "teacherPlus" yields teacherDefault', async () => {
    const res = await request(buildApp())
      .post("/api/user/register")
      .send({ ...validPayload, role: "teacherPlus" });

    expect(res.status).toBe(201);
    expect(global.__written.role).toBe("teacherDefault");
  });

  test("registering with role teacherEnterprise yields teacherDefault", async () => {
    const res = await request(buildApp())
      .post("/api/user/register")
      .send({ ...validPayload, role: "teacherEnterprise" });

    expect(res.status).toBe(201);
    expect(global.__written.role).toBe("teacherDefault");
  });

  test("a registration sending no role still gets teacherDefault", async () => {
    const res = await request(buildApp()).post("/api/user/register").send(validPayload);

    expect(res.status).toBe(201);
    expect(global.__written.role).toBe("teacherDefault");
  });

  test("an unknown role value is ignored rather than rejected", async () => {
    // Previously this produced a 400 from the enum check. Silently ignoring the
    // field is the point: the client has no say in the role either way.
    const res = await request(buildApp())
      .post("/api/user/register")
      .send({ ...validPayload, role: "not-a-real-role" });

    expect(res.status).toBe(201);
    expect(global.__written.role).toBe("teacherDefault");
  });

  test("registration still stores the legitimate profile fields", async () => {
    await request(buildApp())
      .post("/api/user/register")
      .send({ ...validPayload, institution: "Test School", jobTitle: "Teacher", role: "admin" });

    expect(global.__written.institution).toBe("Test School");
    expect(global.__written.jobTitle).toBe("Teacher");
    expect(global.__written.subscriptionType).toBe("basic");
  });

  test("required-field validation still applies", async () => {
    const res = await request(buildApp())
      .post("/api/user/register")
      .send({ email: "attacker@example.com" });

    expect(res.status).toBe(400);
    expect(global.__written).toBeUndefined();
  });
});
