/**
 * /cancel used to call a `stripe` binding that was never imported into this
 * file — only ../utils/stripeClient exports one, via getStripe(). Cancelling
 * a premium subscription with a stripeSubscriptionId threw
 * `ReferenceError: stripe is not defined` and surfaced as a 500 (issue #432).
 *
 * getStripe() reads process.env.STRIPE_SECRET_KEY once, at module load, so
 * it must be set before ../utils/stripeClient (transitively required by
 * ../routes/subscription) is first required in this file.
 */

process.env.STRIPE_SECRET_KEY = "sk_test_dummy";

const mockStripeClient = {
  subscriptions: {
    del: jest.fn().mockResolvedValue({ id: "sub_test_123", status: "canceled" }),
  },
};

jest.mock("stripe", () => jest.fn(() => mockStripeClient));

jest.mock("../middleware/authenticateUser", () =>
  jest.fn((req, res, next) => {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
    req.user = { uid: header.slice(7) };
    next();
  })
);

const mockUserData = {
  email: "teacher@example.com",
  subscriptionType: "premium",
  stripePaymentIntentId: "pi_test_123",
  stripeSubscriptionId: "sub_test_123",
};
const mockUserRef = { update: jest.fn().mockResolvedValue(undefined) };
const mockLogsCollection = { add: jest.fn().mockResolvedValue({ id: "log-1" }) };
const mockAdmin = { firestore: { FieldValue: { serverTimestamp: () => "TIMESTAMP" } } };

jest.mock("../services/databaseService", () => ({
  databaseService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    getDb: jest.fn(() => ({
      collection: jest.fn((name) => {
        if (name === "users") {
          return { doc: () => ({ get: async () => ({ exists: true, data: () => mockUserData }), update: mockUserRef.update }) };
        }
        // Every other collection (e.g. payment_logs).
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
          add: mockLogsCollection.add,
        };
      }),
    })),
    getAdmin: jest.fn(() => mockAdmin),
  },
}));

const express = require("express");
const request = require("supertest");
const subscriptionRouter = require("../routes/subscription");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/", subscriptionRouter);
  return app;
}

describe("#432 — POST /cancel uses getStripe(), not an undefined `stripe`", () => {
  test("cancelling a premium subscription with a stripeSubscriptionId succeeds", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/cancel")
      .set("Authorization", "Bearer test-uid")
      .send({ reason: "too expensive" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ subscriptionStatus: "cancelled" });
    expect(mockStripeClient.subscriptions.del).toHaveBeenCalledWith("sub_test_123");
  });
});
