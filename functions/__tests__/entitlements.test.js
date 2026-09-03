/**
 * Payment verification and idempotency (issue #422).
 *
 * The old code granted teacherPlus on the strength of a request body: no
 * Stripe call, no check that the payment succeeded, no check that it belonged
 * to the caller, and no protection against replaying the same confirmation.
 */

const {
  roleForPlan,
  subscriptionEndDate,
  verifyPaymentIntent,
  claimPaymentIntent,
} = require("../utils/entitlements");

const USER = "buyer-uid";
const OTHER = "someone-else-uid";

function stripeWith(intents) {
  return {
    paymentIntents: {
      retrieve: async (id) => {
        if (!intents[id]) {
          const err = new Error("No such payment_intent");
          err.code = "resource_missing";
          throw err;
        }
        return intents[id];
      },
    },
  };
}

const succeeded = {
  id: "pi_ok",
  status: "succeeded",
  amount: 999,
  currency: "usd",
  customer: "cus_1",
  metadata: { userId: USER, planType: "premium", upgradeFrom: "basic" },
};

describe("roleForPlan", () => {
  test("premium plans grant teacherPlus", () => {
    expect(roleForPlan("premium")).toBe("teacherPlus");
    expect(roleForPlan("premiumYearly")).toBe("teacherPlus");
  });

  test("enterprise grants teacherEnterprise", () => {
    expect(roleForPlan("enterprise")).toBe("teacherEnterprise");
  });

  test("an unknown plan grants nothing", () => {
    expect(roleForPlan("basic")).toBeNull();
    expect(roleForPlan("admin")).toBeNull();
  });
});

describe("subscriptionEndDate", () => {
  const from = new Date("2026-01-15T00:00:00Z");

  test("monthly adds one month", () => {
    expect(subscriptionEndDate("premium", from).toISOString()).toBe("2026-02-15T00:00:00.000Z");
  });

  test("yearly adds one year", () => {
    expect(subscriptionEndDate("premiumYearly", from).toISOString()).toBe("2027-01-15T00:00:00.000Z");
  });
});

describe("verifyPaymentIntent", () => {
  const stripe = stripeWith({ pi_ok: succeeded });

  test("accepts a succeeded intent belonging to the caller", async () => {
    const res = await verifyPaymentIntent(stripe, "pi_ok", USER, "premium");
    expect(res.ok).toBe(true);
    expect(res.paymentIntent.id).toBe("pi_ok");
  });

  test("rejects a missing payment intent id", async () => {
    const res = await verifyPaymentIntent(stripe, undefined, USER, "premium");
    expect(res).toMatchObject({ ok: false, status: 400 });
  });

  test("rejects an id Stripe does not recognise", async () => {
    const res = await verifyPaymentIntent(stripe, "pi_forged", USER, "premium");
    expect(res).toMatchObject({ ok: false, status: 400 });
  });

  test("rejects an intent that has not succeeded", async () => {
    const s = stripeWith({ pi_pending: { ...succeeded, id: "pi_pending", status: "requires_payment_method" } });
    const res = await verifyPaymentIntent(s, "pi_pending", USER, "premium");
    expect(res).toMatchObject({ ok: false, status: 400 });
  });

  test("rejects another user's successful payment", async () => {
    const res = await verifyPaymentIntent(stripe, "pi_ok", OTHER, "premium");
    expect(res).toMatchObject({ ok: false, status: 403 });
  });

  test("rejects redeeming a monthly payment for a yearly plan", async () => {
    const res = await verifyPaymentIntent(stripe, "pi_ok", USER, "premiumYearly");
    expect(res).toMatchObject({ ok: false, status: 400 });
  });

  test("skips the plan check when no plan is expected", async () => {
    const res = await verifyPaymentIntent(stripe, "pi_ok", USER, null);
    expect(res.ok).toBe(true);
  });
});

describe("claimPaymentIntent — a replay must not pay out twice", () => {
  function fakeDb() {
    const store = new Set();
    return {
      store,
      collection: () => ({
        doc: (id) => ({
          create: async (data) => {
            if (store.has(id)) {
              const err = new Error("Document already exists");
              err.code = 6;
              throw err;
            }
            store.add(id);
            return data;
          },
        }),
      }),
    };
  }

  test("the first claim wins", async () => {
    const db = fakeDb();
    await expect(claimPaymentIntent(db, "payment_logs", "pi_ok", {})).resolves.toBe(true);
  });

  test("a replayed claim loses", async () => {
    const db = fakeDb();
    await claimPaymentIntent(db, "payment_logs", "pi_ok", {});
    await expect(claimPaymentIntent(db, "payment_logs", "pi_ok", {})).resolves.toBe(false);
  });

  test("different payments each get their own claim", async () => {
    const db = fakeDb();
    await expect(claimPaymentIntent(db, "payment_logs", "pi_a", {})).resolves.toBe(true);
    await expect(claimPaymentIntent(db, "payment_logs", "pi_b", {})).resolves.toBe(true);
  });

  test("an unexpected database error is not swallowed as a duplicate", async () => {
    const db = {
      collection: () => ({
        doc: () => ({
          create: async () => {
            const err = new Error("network down");
            err.code = 14;
            throw err;
          },
        }),
      }),
    };
    await expect(claimPaymentIntent(db, "payment_logs", "pi_x", {})).rejects.toThrow("network down");
  });
});
