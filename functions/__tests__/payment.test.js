/**
 * Smoke tests for the Stripe-calling payment endpoints (issue #432).
 *
 * Three endpoints referenced a module-scope `stripe` that was never
 * defined — only `req.stripe`, set by the `requireStripe` middleware,
 * exists. Each call threw `ReferenceError: stripe is not defined` and
 * surfaced to the client as a generic 500. These tests mount the real
 * router and exercise the real handler code, with only Stripe's network
 * client and the database layer replaced by test doubles, so a
 * reintroduced `stripe.` reference (instead of `req.stripe.`) fails the
 * relevant test with that same ReferenceError instead of shipping silently.
 */

process.env.STRIPE_SECRET_KEY_TEST = "sk_test_dummy";

const mockStripeClient = {
  paymentIntents: {
    create: jest.fn().mockResolvedValue({ id: "pi_test_123", client_secret: "pi_test_123_secret" }),
    retrieve: jest.fn().mockResolvedValue({
      id: "pi_test_123",
      status: "succeeded",
      customer: null,
      metadata: { userId: "test-uid", planType: "premium" },
    }),
    update: jest.fn().mockResolvedValue({}),
  },
  checkout: {
    sessions: {
      create: jest.fn().mockResolvedValue({ id: "cs_test_123", client_secret: "cs_test_123_secret" }),
    },
  },
};

jest.mock("stripe", () => jest.fn(() => mockStripeClient));

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

const mockUserData = { email: "teacher@example.com", subscriptionType: "basic", role: "teacherDefault" };
const mockUserRef = { update: jest.fn().mockResolvedValue(undefined) };
const mockUserSnap = { exists: true, data: () => mockUserData };
const mockLogsCollection = { add: jest.fn().mockResolvedValue({ id: "log-1" }) };
const mockDb = { collection: jest.fn(() => mockLogsCollection) };
const mockAdmin = {
  firestore: {
    FieldValue: { serverTimestamp: () => "TIMESTAMP" },
    Timestamp: { fromDate: (d) => d },
  },
};

jest.mock("../services/databaseService", () => ({
  databaseService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    getDb: jest.fn(() => mockDb),
    getAdmin: jest.fn(() => mockAdmin),
    getUserDocument: jest.fn().mockResolvedValue({ ref: mockUserRef, snap: mockUserSnap }),
  },
}));

const express = require("express");
const request = require("supertest");
const paymentRouter = require("../routes/payment");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/", paymentRouter);
  return app;
}

describe("#432 — payment endpoints use req.stripe, not an undefined `stripe`", () => {
  test("POST /create-payment-intent reaches Stripe", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/create-payment-intent")
      .set("Authorization", "Bearer test-uid")
      .send({ planType: "premium" });

    expect(res.status).toBe(200);
    expect(mockStripeClient.paymentIntents.create).toHaveBeenCalled();
  });

  test("POST /create-embedded-checkout-session reaches Stripe", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/create-embedded-checkout-session")
      .set("Authorization", "Bearer test-uid")
      .send({ planType: "premiumYearly" });

    expect(res.status).toBe(200);
    expect(mockStripeClient.checkout.sessions.create).toHaveBeenCalled();
  });

  test("POST /confirm-payment reaches Stripe", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/confirm-payment")
      .set("Authorization", "Bearer test-uid")
      .send({ paymentIntentId: "pi_test_123" });

    expect(res.status).toBe(200);
    expect(mockStripeClient.paymentIntents.retrieve).toHaveBeenCalledWith("pi_test_123");
  });

  // /create-module-checkout-session already used req.stripe correctly (the
  // one endpoint the issue said still worked) and reads Firestore through its
  // own module-scope getDb() via the real firebase-admin SDK rather than the
  // mockable databaseService, so it isn't a fit for this mock-based suite.
});
