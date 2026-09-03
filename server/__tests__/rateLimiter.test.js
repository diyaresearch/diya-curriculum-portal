/**
 * Rate limiting (issue #383).
 *
 * There was no rate limiting anywhere in this server - RATE_LIMIT_WINDOW_MS/
 * RATE_LIMIT_MAX_REQUESTS were declared in every .env.* file and listed in
 * envValidator.js, but nothing ever read them.
 */

const express = require("express");
const request = require("supertest");

// rateLimiter.js reads RATE_LIMIT_WINDOW_MS/RATE_LIMIT_MAX_REQUESTS at
// require time, so they must be set before it's required. jest.resetModules
// + a fresh require in each describe block lets different tests use
// different limits without interfering with each other.
function freshGeneralLimiter({ windowMs = "60000", max = "3" } = {}) {
  jest.resetModules();
  process.env.RATE_LIMIT_WINDOW_MS = windowMs;
  process.env.RATE_LIMIT_MAX_REQUESTS = max;
  return require("../middleware/rateLimiter").generalLimiter;
}

function appWithLimiter(limiter) {
  const app = express();
  app.use("/api", limiter);
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/thing", (_req, res) => res.json({ ok: true }));
  return app;
}

describe("#383 — generalLimiter", () => {
  afterEach(() => {
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX_REQUESTS;
  });

  test("allows requests up to the configured max", async () => {
    const app = appWithLimiter(freshGeneralLimiter({ max: "3" }));
    for (let i = 0; i < 3; i++) {
      const res = await request(app).get("/api/thing");
      expect(res.status).toBe(200);
    }
  });

  test("the next request over the max is rejected with the standard error envelope", async () => {
    const app = appWithLimiter(freshGeneralLimiter({ max: "3" }));
    for (let i = 0; i < 3; i++) {
      await request(app).get("/api/thing");
    }

    const res = await request(app).get("/api/thing");
    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({
      success: false,
      statusCode: 429,
      error: { code: "RATE_LIMIT_EXCEEDED" },
    });
  });

  test("/api/health is exempt, even after the limit is exhausted", async () => {
    const app = appWithLimiter(freshGeneralLimiter({ max: "1" }));
    await request(app).get("/api/thing"); // consume the one allowed request
    expect((await request(app).get("/api/thing")).status).toBe(429);

    for (let i = 0; i < 5; i++) {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
    }
  });

  test("falls back to sensible defaults when the env vars are unset", () => {
    jest.resetModules();
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX_REQUESTS;
    // Just needs to not throw at require time with nothing configured.
    expect(() => require("../middleware/rateLimiter")).not.toThrow();
  });
});

describe("#383 — strictLimiter keys by authenticated user, not just IP", () => {
  function strictApp() {
    jest.resetModules();
    const { strictLimiter } = require("../middleware/rateLimiter");
    const app = express();
    // Simulate authenticateUser having already run and attached req.user,
    // the way every route that mounts strictLimiter does it for real.
    app.use((req, _res, next) => {
      const uid = req.headers["x-test-uid"];
      if (uid) req.user = { uid };
      next();
    });
    app.post("/api/sensitive", strictLimiter, (_req, res) => res.json({ ok: true }));
    return app;
  }

  test("one user's requests don't count against another user's budget", async () => {
    process.env.RATE_LIMIT_WINDOW_MS = "60000"; // strictLimiter's own limit isn't env-driven,
    process.env.RATE_LIMIT_MAX_REQUESTS = "3"; // but exercise alongside a general-limiter config anyway
    const app = strictApp();

    // Exhaust user A's budget by hammering well past the strict max.
    let lastStatus;
    for (let i = 0; i < 25; i++) {
      lastStatus = (await request(app).post("/api/sensitive").set("x-test-uid", "user-a")).status;
    }
    expect(lastStatus).toBe(429);

    // User B, same process, same test - a shared/global bucket would also
    // reject this; a correctly per-user bucket does not.
    const forB = await request(app).post("/api/sensitive").set("x-test-uid", "user-b");
    expect(forB.status).toBe(200);

    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX_REQUESTS;
  });
});

describe("#359 follow-up — IPv6 addresses are normalized, not used raw", () => {
  // express-rate-limit's own runtime validator throws ERR_ERL_KEY_GEN_IPV6
  // if a custom keyGenerator uses req.ip directly instead of going through
  // ipKeyGenerator(). Caught live at boot while working on #359, unrelated
  // to that issue - fixed here. `trust proxy` + spoofed X-Forwarded-For
  // simulates two connections whose IPv6 addresses fall in the same /56,
  // the way a single client's traffic legitimately varies.
  function unauthedApp() {
    jest.resetModules();
    process.env.RATE_LIMIT_WINDOW_MS = "60000";
    process.env.RATE_LIMIT_MAX_REQUESTS = "3";
    const { generalLimiter } = require("../middleware/rateLimiter");
    const app = express();
    app.set("trust proxy", true);
    app.use("/api", generalLimiter);
    app.get("/api/thing", (_req, res) => res.json({ ok: true }));
    return app;
  }

  afterEach(() => {
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX_REQUESTS;
  });

  test("constructing the limiter doesn't trip express-rate-limit's IPv6 validator", () => {
    // The validator runs (and would throw/warn) the first time the
    // middleware actually handles a request, not at construction - covered
    // by the requests below, but this documents the specific failure mode.
    expect(() => unauthedApp()).not.toThrow();
  });

  test("two IPv6 addresses in the same /56 share one rate-limit bucket", async () => {
    const app = unauthedApp();
    const addrA = "2001:db8::1";
    const addrB = "2001:db8::abcd"; // same /56 as addrA, different host

    for (let i = 0; i < 3; i++) {
      const res = await request(app).get("/api/thing").set("X-Forwarded-For", addrA);
      expect(res.status).toBe(200);
    }

    // addrA's budget is exhausted; addrB should already be blocked too if
    // (and only if) both normalize into the same bucket.
    const res = await request(app).get("/api/thing").set("X-Forwarded-For", addrB);
    expect(res.status).toBe(429);
  });

  test("an IPv6 address in a different /56 gets its own budget", async () => {
    const app = unauthedApp();
    const addrA = "2001:db8::1";
    const addrC = "2001:db9::1"; // different /56 from addrA

    for (let i = 0; i < 3; i++) {
      await request(app).get("/api/thing").set("X-Forwarded-For", addrA);
    }

    const res = await request(app).get("/api/thing").set("X-Forwarded-For", addrC);
    expect(res.status).toBe(200);
  });
});
