/**
 * The two lesson routes that served paid content to anyone (issue #430).
 *
 * `GET /api/lesson/:lessonId` and `GET /api/lessons/:lessonId/download`
 * mounted no auth middleware and ran no entitlement check, so an anonymous
 * request with a lesson id returned the full document - and the same content
 * again as a PDF. This drives the real routers over HTTP, because the defect
 * was in the route wiring as much as in the controller.
 */

const express = require("express");
const request = require("supertest");

// Tokens are "Bearer <uid>"; no token means anonymous, which is the case that
// used to be served paid content.
jest.mock("../middleware/optionalAuth", () =>
  jest.fn((req, _res, next) => {
    const header = req.headers.authorization || "";
    if (header.startsWith("Bearer ")) req.user = { uid: header.slice(7) };
    next();
  })
);

jest.mock("../middleware/authenticateUser", () =>
  jest.fn((req, res, next) => {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
    req.user = { uid: header.slice(7) };
    next();
  })
);

jest.mock("../middleware/requireRole", () => ({
  requireRole: () => (_req, _res, next) => next(),
  requireAdmin: jest.fn((_req, _res, next) => next()),
  requireValidUser: jest.fn((_req, _res, next) => next()),
}));

const PAID_LESSON = "paid-lesson-id";
const FREE_LESSON = "free-lesson-id";
const LESSON_AUTHOR = "lEsSoNaUtHoR1234567890abcdef";
const BUYER = "bUyErGhIjKlMnOpQrStUvWxYz345";
const STRANGER = "sTrAnGeRkLmNoPqRsTuVwXyZ6789";

const LESSONS = {
  [PAID_LESSON]: {
    title: "Inside the paid module",
    authorId: LESSON_AUTHOR,
    objectives: ["secret objective"],
    sections: [{ title: "Section", intro: "<p>paid content</p>", contentIds: [] }],
  },
  [FREE_LESSON]: {
    title: "Free standing lesson",
    authorId: LESSON_AUTHOR,
    objectives: ["open objective"],
    sections: [],
  },
};

const MODULES = {
  "paid-module": { title: "Paid", price: 49, author: "someoneElse", lessonPlans: [PAID_LESSON] },
};

// Entitlement ids the webhook would have written.
let entitlements = new Set();

jest.mock("../services/databaseService", () => ({
  databaseService: {
    initialize: async () => {},
    getUserDocument: async () => ({ snap: { exists: false, data: () => ({}) } }),
    getDb: () => ({
      collection(name) {
        if (name === "lesson") {
          return {
            doc: (id) => ({
              get: async () => ({
                exists: Object.prototype.hasOwnProperty.call(global.__lessons, id),
                id,
                data: () => global.__lessons[id],
              }),
            }),
          };
        }
        if (name === "entitlements") {
          return { doc: (id) => ({ get: async () => ({ exists: global.__entitlements.has(id) }) }) };
        }
        if (name === "module") {
          return {
            where: (field, op, value) => ({
              get: async () => {
                const matched = Object.entries(global.__modules).filter(
                  ([, d]) =>
                    field === "lessonPlans" &&
                    op === "array-contains" &&
                    Array.isArray(d.lessonPlans) &&
                    d.lessonPlans.includes(value)
                );
                return { forEach: (fn) => matched.forEach(([id, d]) => fn({ id, data: () => d })) };
              },
            }),
          };
        }
        if (name === "content") {
          return { doc: () => ({ get: async () => ({ exists: false, data: () => ({}) }) }) };
        }
        throw new Error(`unexpected collection ${name}`);
      },
    }),
  },
}));

function app() {
  const a = express();
  a.use(express.json());
  a.use("/api", require("../routes/lessons"));
  return a;
}

beforeEach(() => {
  global.__lessons = LESSONS;
  global.__modules = MODULES;
  entitlements = new Set();
  global.__entitlements = entitlements;
});

describe("#430 — GET /api/lesson/:lessonId", () => {
  test("an anonymous request for a paid module's lesson is refused", async () => {
    const res = await request(app()).get(`/api/lesson/${PAID_LESSON}`);
    expect(res.status).toBe(401);
  });

  test("the refusal leaks none of the lesson", async () => {
    const res = await request(app()).get(`/api/lesson/${PAID_LESSON}`);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain("secret objective");
    expect(body).not.toContain("paid content");
    expect(body).not.toContain("Inside the paid module");
  });

  test("a signed-in stranger who has not purchased gets 403", async () => {
    const res = await request(app())
      .get(`/api/lesson/${PAID_LESSON}`)
      .set("Authorization", `Bearer ${STRANGER}`);
    expect(res.status).toBe(403);
  });

  test("the buyer gets the lesson once the webhook has written the entitlement", async () => {
    global.__entitlements = new Set([`${BUYER}_paid-module`]);
    const res = await request(app())
      .get(`/api/lesson/${PAID_LESSON}`)
      .set("Authorization", `Bearer ${BUYER}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Inside the paid module");
  });

  test("the lesson's author gets it without an entitlement", async () => {
    const res = await request(app())
      .get(`/api/lesson/${PAID_LESSON}`)
      .set("Authorization", `Bearer ${LESSON_AUTHOR}`);
    expect(res.status).toBe(200);
  });

  test("a lesson no paid module contains is still public", async () => {
    const res = await request(app()).get(`/api/lesson/${FREE_LESSON}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Free standing lesson");
  });

  test("a missing lesson is still 404, not 401", async () => {
    const res = await request(app()).get("/api/lesson/does-not-exist");
    expect(res.status).toBe(404);
  });
});

describe("#430 — GET /api/lessons/:lessonId/download", () => {
  test("an anonymous PDF request for a paid lesson is refused", async () => {
    const res = await request(app()).get(`/api/lessons/${PAID_LESSON}/download`);
    expect(res.status).toBe(401);
  });

  test("the refusal is JSON, not a PDF — nothing was piped before the check", async () => {
    const res = await request(app()).get(`/api/lessons/${PAID_LESSON}/download`);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.headers["content-disposition"]).toBeUndefined();
  });

  test("a signed-in stranger who has not purchased gets 403", async () => {
    const res = await request(app())
      .get(`/api/lessons/${PAID_LESSON}/download`)
      .set("Authorization", `Bearer ${STRANGER}`);
    expect(res.status).toBe(403);
  });

  test("a free lesson still downloads", async () => {
    const res = await request(app()).get(`/api/lessons/${FREE_LESSON}/download`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/pdf/);
  });
});
