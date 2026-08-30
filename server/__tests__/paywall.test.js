/**
 * Paywall route behaviour (issue #422).
 *
 * /process-payment used to grant teacherPlus with no Stripe call at all. This
 * asserts the route can no longer write anything, whatever it is sent.
 */

const express = require("express");
const request = require("supertest");

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

// Any write through the database service is a failure for these tests.
const writes = [];
jest.mock("../services/databaseService", () => ({
  databaseService: {
    initialize: async () => {},
    getDb: () => ({
      collection: () => ({
        doc: () => ({
          get: async () => ({ exists: true, data: () => ({ role: "teacherDefault" }) }),
          update: async (d) => { global.__writes.push(d); },
          create: async (d) => { global.__writes.push(d); },
        }),
        add: async (d) => { global.__writes.push(d); },
      }),
    }),
    getAdmin: () => ({ firestore: { FieldValue: { serverTimestamp: () => "ts" }, Timestamp: { fromDate: (d) => d } } }),
    getUserDocument: async () => ({
      ref: { update: async (d) => { global.__writes.push(d); } },
      snap: { exists: true, data: () => ({ role: "teacherDefault", subscriptionType: "basic" }) },
    }),
  },
}));

// Stripe unavailable: proves the paywall fails closed rather than falling back
// to the old "simulate a successful payment" branch.
jest.mock("../utils/stripeClient", () => ({
  getStripe: () => null,
  requireStripe: (_req, res) =>
    res.status(503).json({ message: "Payment service unavailable" }),
}));

function app() {
  const a = express();
  a.use(express.json());
  a.use("/api/subscription", require("../routes/subscription"));
  return a;
}

beforeEach(() => { global.__writes = []; });

describe("#422 — /process-payment cannot grant a subscription", () => {
  test("it no longer processes a payment, even with a plausible body", async () => {
    const res = await request(app())
      .post("/api/subscription/process-payment")
      .set("Authorization", "Bearer attacker-uid")
      .send({ planType: "premium", amount: 9.99, cardInfo: { cardNumber: "4242424242424242" }, billingCycle: "monthly" });

    expect(res.status).toBe(410);
    expect(global.__writes).toHaveLength(0);
  });

  test("it writes nothing for the yearly plan either", async () => {
    const res = await request(app())
      .post("/api/subscription/process-payment")
      .set("Authorization", "Bearer attacker-uid")
      .send({ planType: "premiumYearly", amount: 100, cardInfo: {} });

    expect(res.status).toBe(410);
    expect(global.__writes).toHaveLength(0);
  });

  test("it still requires authentication", async () => {
    const res = await request(app()).post("/api/subscription/process-payment").send({ planType: "premium" });
    expect(res.status).toBe(401);
    expect(global.__writes).toHaveLength(0);
  });
});

describe("#422 — /complete-upgrade requires a working Stripe", () => {
  test("with Stripe unavailable it refuses rather than granting", async () => {
    const res = await request(app())
      .post("/api/subscription/complete-upgrade")
      .set("Authorization", "Bearer attacker-uid")
      .send({ targetPlan: "premium", paymentIntentId: "pi_made_up" });

    expect(res.status).toBe(503);
    expect(global.__writes).toHaveLength(0);
  });

  test("anonymous callers are rejected", async () => {
    const res = await request(app())
      .post("/api/subscription/complete-upgrade")
      .send({ targetPlan: "premium", paymentIntentId: "pi_made_up" });

    expect(res.status).toBe(401);
    expect(global.__writes).toHaveLength(0);
  });
});
