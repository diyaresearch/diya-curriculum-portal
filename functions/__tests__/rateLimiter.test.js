/**
 * Rate limiting on the payments function (issue #383, extended here since
 * #439 moved all payment processing onto this backend - see the comment at
 * the top of middleware/rateLimiter.js for why).
 */

const express = require("express");
const request = require("supertest");
const { strictLimiter } = require("../middleware/rateLimiter");

function app() {
  const a = express();
  // Simulate authenticateUser having already run, the way every route that
  // mounts strictLimiter does it for real.
  a.use((req, _res, next) => {
    const uid = req.headers["x-test-uid"];
    if (uid) req.user = { uid };
    next();
  });
  a.post("/api/payment/sensitive", strictLimiter, (_req, res) => res.json({ ok: true }));
  return a;
}

describe("#383 — functions/'s strictLimiter", () => {
  test("rejects a request past the max with the standard error envelope", async () => {
    const a = app();
    let lastRes;
    for (let i = 0; i < 25; i++) {
      lastRes = await request(a).post("/api/payment/sensitive").set("x-test-uid", "flooder");
    }
    expect(lastRes.status).toBe(429);
    expect(lastRes.body).toMatchObject({
      success: false,
      statusCode: 429,
      error: { code: "RATE_LIMIT_EXCEEDED" },
    });
  });

  test("keys by authenticated user, not a single shared bucket", async () => {
    const a = app();
    for (let i = 0; i < 25; i++) {
      await request(a).post("/api/payment/sensitive").set("x-test-uid", "user-a");
    }
    const forB = await request(a).post("/api/payment/sensitive").set("x-test-uid", "user-b");
    expect(forB.status).toBe(200);
  });

  // #359 follow-up: the IP fallback must go through ipKeyGenerator, not
  // req.ip raw - see the matching test/comment in server/__tests__/
  // rateLimiter.test.js for the full explanation.
  test("unauthenticated: two IPv6 addresses in the same /56 share one bucket", async () => {
    const a = express();
    a.set("trust proxy", true);
    a.post("/api/payment/sensitive", strictLimiter, (_req, res) => res.json({ ok: true }));

    for (let i = 0; i < 25; i++) {
      await request(a).post("/api/payment/sensitive").set("X-Forwarded-For", "2001:db8::1");
    }
    const res = await request(a)
      .post("/api/payment/sensitive")
      .set("X-Forwarded-For", "2001:db8::abcd"); // same /56, different host
    expect(res.status).toBe(429);
  });
});
