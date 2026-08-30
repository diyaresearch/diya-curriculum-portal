/**
 * Module entitlement enforcement (issues #429, #430).
 *
 * Payment and access used to be entirely disconnected: the webhook wrote a log
 * row and nothing else, and the module page rendered every lesson regardless.
 */

jest.mock("../services/databaseService", () => ({
  databaseService: {
    initialize: async () => {},
    getUserDocument: async (uid) => ({
      snap: {
        exists: Boolean(global.__roles && global.__roles[uid]),
        data: () => ({ role: global.__roles[uid] }),
      },
    }),
  },
}));

const { modulePrice, isPaidModule, canAccessModule } = require("../utils/entitlements.check");
const { checkChargedAmount, grantModuleEntitlement } = require("../utils/entitlementGrant");

const AUTHOR = "aBcDeFgHiJkLmNoPqRsTuVwXyZ12";
const BUYER = "bUyErGhIjKlMnOpQrStUvWxYz345";
const STRANGER = "sTrAnGeRkLmNoPqRsTuVwXyZ6789";

function fakeDb(entitlements = new Set()) {
  return {
    written: [],
    collection() {
      const self = this;
      return {
        doc: (id) => ({
          get: async () => ({ exists: entitlements.has(id) }),
          set: async (data) => { self.written.push({ id, data }); entitlements.add(id); },
        }),
      };
    },
  };
}

const fakeAdmin = { firestore: { FieldValue: { serverTimestamp: () => "ts" } } };

beforeEach(() => { global.__roles = {}; });

describe("#429 — price reading", () => {
  test("reads either field spelling", () => {
    expect(modulePrice({ price: 10 })).toBe(10);
    expect(modulePrice({ Price: 25 })).toBe(25);
  });

  test("a module with no price is free", () => {
    expect(isPaidModule({ title: "Free" })).toBe(false);
    expect(isPaidModule({ price: 0 })).toBe(false);
    expect(isPaidModule({ price: "not a number" })).toBe(false);
  });

  test("a positive price makes a module paid", () => {
    expect(isPaidModule({ price: 0.01 })).toBe(true);
  });
});

describe("#429 — charged amount must match the module's price", () => {
  test("matching amounts pass", () => {
    expect(checkChargedAmount({ expectedAmountCents: "4999" }, 4999).matches).toBe(true);
  });

  test("an underpayment is caught", () => {
    const res = checkChargedAmount({ expectedAmountCents: "4999" }, 1);
    expect(res.matches).toBe(false);
    expect(res.expectedCents).toBe(4999);
    expect(res.chargedCents).toBe(1);
  });

  test("an overpayment is caught too", () => {
    expect(checkChargedAmount({ expectedAmountCents: "4999" }, 9999).matches).toBe(false);
  });

  test("sessions predating the metadata still fulfil", () => {
    // Old sessions carry no expected amount; they cannot be checked, and
    // refusing them would strand legitimate purchases.
    expect(checkChargedAmount({}, 4999).matches).toBe(true);
  });
});

describe("#430 — access to a paid module", () => {
  const paid = { title: "Paid", price: 49.99, author: AUTHOR };
  const free = { title: "Free", author: AUTHOR };

  test("a free module is open to anyone, signed in or not", async () => {
    await expect(canAccessModule(fakeDb(), "entitlements", null, "m1", free))
      .resolves.toMatchObject({ allowed: true });
  });

  test("an anonymous visitor cannot open a paid module", async () => {
    await expect(canAccessModule(fakeDb(), "entitlements", null, "m1", paid))
      .resolves.toMatchObject({ allowed: false });
  });

  test("a signed-in stranger who has not paid cannot open it", async () => {
    await expect(canAccessModule(fakeDb(), "entitlements", STRANGER, "m1", paid))
      .resolves.toMatchObject({ allowed: false, reason: "not purchased" });
  });

  test("a buyer with an entitlement can open it", async () => {
    const db = fakeDb(new Set([`${BUYER}_m1`]));
    await expect(canAccessModule(db, "entitlements", BUYER, "m1", paid))
      .resolves.toMatchObject({ allowed: true, reason: "purchased" });
  });

  test("an entitlement for a different module does not unlock this one", async () => {
    const db = fakeDb(new Set([`${BUYER}_other`]));
    await expect(canAccessModule(db, "entitlements", BUYER, "m1", paid))
      .resolves.toMatchObject({ allowed: false });
  });

  test("the author keeps access to their own paid module", async () => {
    await expect(canAccessModule(fakeDb(), "entitlements", AUTHOR, "m1", paid))
      .resolves.toMatchObject({ allowed: true, reason: "author" });
  });

  test("an admin can open any module", async () => {
    global.__roles[STRANGER] = "admin";
    await expect(canAccessModule(fakeDb(), "entitlements", STRANGER, "m1", paid))
      .resolves.toMatchObject({ allowed: true, reason: "admin" });
  });
});

describe("#430 — the grant is idempotent", () => {
  const args = {
    userId: BUYER,
    moduleId: "m1",
    checkoutSessionId: "cs_1",
    paymentIntentId: "pi_1",
    amountCents: 4999,
    priceAtPurchase: "49.99",
    livemode: false,
  };

  test("granting writes one document keyed by user and module", async () => {
    const db = fakeDb();
    const res = await grantModuleEntitlement(db, fakeAdmin, "entitlements", args);
    expect(res).toMatchObject({ granted: true, id: `${BUYER}_m1` });
    expect(db.written).toHaveLength(1);
  });

  test("replaying the same event rewrites the same document, not a second one", async () => {
    const db = fakeDb();
    await grantModuleEntitlement(db, fakeAdmin, "entitlements", args);
    await grantModuleEntitlement(db, fakeAdmin, "entitlements", args);
    const ids = new Set(db.written.map((w) => w.id));
    expect(ids.size).toBe(1);
  });

  test("a grant missing its user or module is refused", async () => {
    const db = fakeDb();
    await expect(grantModuleEntitlement(db, fakeAdmin, "entitlements", { moduleId: "m1" }))
      .resolves.toMatchObject({ granted: false });
    expect(db.written).toHaveLength(0);
  });
});
