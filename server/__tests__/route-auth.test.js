/**
 * Route-level authentication coverage (issue #424).
 *
 * Several mutating routes had no auth middleware at all and were callable
 * anonymously. These tests assert the middleware is actually wired up, by
 * mounting the real routers with an authenticateUser stub that rejects
 * unauthenticated requests exactly as the real one does.
 */

const express = require("express");
const request = require("supertest");

jest.mock("../middleware/authenticateUser", () =>
  jest.fn((req, res, next) => {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = { uid: header.slice(7) };
    next();
  })
);

jest.mock("../middleware/requireRole", () => ({
  requireRole: () => (_req, _res, next) => next(),
  requireAdmin: jest.fn((req, res, next) => {
    if (req.user && req.user.uid === "admin-uid") return next();
    return res.status(403).json({ message: "Access denied. Admin only." });
  }),
  requireValidUser: jest.fn((_req, _res, next) => next()),
  requireTeacher: jest.fn((_req, _res, next) => next()),
  requirePremiumTeacher: jest.fn((_req, _res, next) => next()),
}));

// Controllers are stubbed: this suite is about whether a request gets past the
// middleware chain, not about what the handler then does.
const reached = jest.fn((_req, res) => res.status(200).json({ ok: true }));

jest.mock("../controllers/moduleController", () => ({
  getAllModules: (_q, r) => r.json([]),
  getModuleById: (_q, r) => r.json({}),
  createModule: (_q, r) => r.status(200).json({ ok: true }),
  editModule: (_q, r) => r.status(200).json({ ok: true }),
  deleteModule: (_q, r) => r.status(200).json({ ok: true }),
}));

jest.mock("../controllers/lessonsController", () => ({
  getAllLessons: (_q, r) => r.json([]),
  getAllLessonsAdmin: (_q, r) => r.status(200).json({ ok: true }),
  getLessonById: (_q, r) => r.json({}),
  getUserLessons: (_q, r) => r.json([]),
  postLesson: (_q, r) => r.json({}),
  updateLesson: (_q, r) => r.json({}),
  downloadPDF: (_q, r) => r.end(),
  deleteLessonById: (_q, r) => r.json({}),
}));

jest.mock("../controllers/unitsController", () => ({
  getAllUnits: (_q, r) => r.json([]),
  getUnitById: (_q, r) => r.json({}),
  getUserUnits: (_q, r) => r.json([]),
  deleteUnit: (_q, r) => r.status(200).json({ ok: true }),
}));

jest.mock("../controllers/content_submission", () => ({ createUnit: (_q, r) => r.json({}) }));
jest.mock("../controllers/update_submission", () => ({
  updateUnitById: (_q, r) => r.status(200).json({ ok: true }),
}));

function app(mountPath, routerPath) {
  const a = express();
  a.use(express.json());
  a.use(mountPath, require(routerPath));
  return a;
}

describe("#424 — mutating routes reject anonymous requests", () => {
  const cases = [
    ["POST", "/api/module", "/api", "../routes/modules"],
    ["POST", "/api/module/abc123", "/api", "../routes/modules"],
    ["DELETE", "/api/module/abc123", "/api", "../routes/modules"],
    ["POST", "/api/update/abc123", "/api", "../routes/units"],
    ["DELETE", "/api/unit/abc123", "/api", "../routes/units"],
  ];

  test.each(cases)("%s %s is 401 without a token", async (method, url, mount, routerPath) => {
    const res = await request(app(mount, routerPath))[method.toLowerCase()](url);
    expect(res.status).toBe(401);
  });

  test.each(cases)("%s %s is allowed with a token", async (method, url, mount, routerPath) => {
    const res = await request(app(mount, routerPath))
      [method.toLowerCase()](url)
      .set("Authorization", "Bearer some-uid");
    expect(res.status).not.toBe(401);
  });
});

describe("#424 — GET /api/lessons/admin is admin-only", () => {
  const lessonsApp = () => app("/api", "../routes/lessons");

  test("anonymous is rejected", async () => {
    const res = await request(lessonsApp()).get("/api/lessons/admin");
    expect(res.status).toBe(401);
  });

  test("a signed-in non-admin is rejected", async () => {
    const res = await request(lessonsApp())
      .get("/api/lessons/admin")
      .set("Authorization", "Bearer regular-uid");
    expect(res.status).toBe(403);
  });

  test("an admin is allowed", async () => {
    const res = await request(lessonsApp())
      .get("/api/lessons/admin")
      .set("Authorization", "Bearer admin-uid");
    expect(res.status).toBe(200);
  });
});

describe("#424 — public read routes stay public", () => {
  test("GET /api/modules needs no token", async () => {
    const res = await request(app("/api", "../routes/modules")).get("/api/modules");
    expect(res.status).toBe(200);
  });

  test("GET /api/lessons needs no token", async () => {
    const res = await request(app("/api", "../routes/lessons")).get("/api/lessons");
    expect(res.status).toBe(200);
  });

  test("GET /api/units needs no token", async () => {
    const res = await request(app("/api", "../routes/units")).get("/api/units");
    expect(res.status).toBe(200);
  });
});
