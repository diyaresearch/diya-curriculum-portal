/**
 * Module pricing and entitlement rules (issues #429, #430).
 *
 * The Stripe charge is computed from `module.price` read server-side at
 * checkout. That is only safe if the client cannot write the field first.
 */

const fs = require("fs");
const path = require("path");
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc, updateDoc } = require("firebase/firestore");

const RULES = fs.readFileSync(
  path.join(__dirname, "..", "..", "portal-app", "firestore.rules"),
  "utf8"
);

const ADMIN = "admin-uid";
const TEACHER = "teacher-uid";
const BUYER = "buyer-uid";

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "rules-test-pricing",
    firestore: { rules: RULES, host: "127.0.0.1", port: 8080 },
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users", ADMIN), { role: "admin" });
    await setDoc(doc(db, "users", TEACHER), { role: "teacherDefault" });
    await setDoc(doc(db, "users", BUYER), { role: "teacherPlus" });
    await setDoc(doc(db, "module", "paid"), {
      title: "Paid module",
      price: 49.99,
      isFeatured: true,
      author: TEACHER,
    });
    await setDoc(doc(db, "entitlements", `${BUYER}_paid`), {
      userId: BUYER,
      moduleId: "paid",
    });
  });
});

const as = (uid) => testEnv.authenticatedContext(uid).firestore();
const anon = () => testEnv.unauthenticatedContext().firestore();

describe("#429 — module price is not client-writable", () => {
  test("a non-admin cannot lower the price", async () => {
    await assertFails(updateDoc(doc(as(TEACHER), "module", "paid"), { price: 0.01 }));
  });

  test("a non-admin cannot raise the price either", async () => {
    await assertFails(updateDoc(doc(as(TEACHER), "module", "paid"), { price: 999 }));
  });

  test("the module's own author cannot change its price", async () => {
    // The author is TEACHER, seeded above — ownership is not pricing authority.
    await assertFails(updateDoc(doc(as(TEACHER), "module", "paid"), { price: 1 }));
  });

  test("a non-admin cannot flip isFeatured", async () => {
    await assertFails(updateDoc(doc(as(TEACHER), "module", "paid"), { isFeatured: false }));
  });

  test("a non-admin cannot smuggle a price under the alternate key", async () => {
    await assertFails(updateDoc(doc(as(TEACHER), "module", "paid"), { Price: 0.01 }));
  });

  test("an admin can change the price", async () => {
    await assertSucceeds(updateDoc(doc(as(ADMIN), "module", "paid"), { price: 59.99 }));
  });

  test("a non-admin can still edit non-pricing fields", async () => {
    await assertSucceeds(
      updateDoc(doc(as(TEACHER), "module", "paid"), { description: "Updated copy" })
    );
  });

  test("a non-admin can create a free module", async () => {
    await assertSucceeds(
      setDoc(doc(as(TEACHER), "module", "free1"), { title: "Free", author: TEACHER })
    );
  });

  test("a non-admin cannot create a module that already has a price", async () => {
    await assertFails(
      setDoc(doc(as(TEACHER), "module", "paid2"), { title: "Mine", price: 99, author: TEACHER })
    );
  });

  test("an admin can create a priced module", async () => {
    await assertSucceeds(
      setDoc(doc(as(ADMIN), "module", "paid3"), { title: "Course", price: 99 })
    );
  });

  test("modules stay publicly readable — the storefront needs them", async () => {
    await assertSucceeds(getDoc(doc(anon(), "module", "paid")));
  });
});

describe("#430 — entitlements are readable but never client-writable", () => {
  test("a buyer can read their own entitlement", async () => {
    await assertSucceeds(getDoc(doc(as(BUYER), "entitlements", `${BUYER}_paid`)));
  });

  test("another user cannot read someone else's entitlement", async () => {
    await assertFails(getDoc(doc(as(TEACHER), "entitlements", `${BUYER}_paid`)));
  });

  test("a user cannot mint an entitlement for themselves", async () => {
    await assertFails(
      setDoc(doc(as(TEACHER), "entitlements", `${TEACHER}_paid`), {
        userId: TEACHER,
        moduleId: "paid",
      })
    );
  });

  test("an admin cannot mint one from the client either — the webhook owns this", async () => {
    await assertFails(
      setDoc(doc(as(ADMIN), "entitlements", `${ADMIN}_paid`), {
        userId: ADMIN,
        moduleId: "paid",
      })
    );
  });

  test("anonymous users cannot read entitlements", async () => {
    await assertFails(getDoc(doc(anon(), "entitlements", `${BUYER}_paid`)));
  });
});

describe("#382 — the admin custom claim is a fast path, not a gate", () => {
  test("a claim alone grants admin, with no profile document at all", async () => {
    const claimed = testEnv
      .authenticatedContext("claim-only-uid", { role: "admin" })
      .firestore();
    await assertSucceeds(updateDoc(doc(claimed, "module", "paid"), { price: 42 }));
  });

  test("a user with no claim still resolves through their profile document", async () => {
    // ADMIN is seeded in users/ with role admin and carries no claim here.
    await assertSucceeds(updateDoc(doc(as(ADMIN), "module", "paid"), { price: 43 }));
  });

  test("a non-admin claim does not grant admin", async () => {
    const claimed = testEnv
      .authenticatedContext("teacherplus-uid", { role: "teacherPlus" })
      .firestore();
    await assertFails(updateDoc(doc(claimed, "module", "paid"), { price: 44 }));
  });

  test("a stale claim cannot withhold access the document still grants", async () => {
    const stale = testEnv
      .authenticatedContext(ADMIN, { role: "teacherDefault" })
      .firestore();
    await assertSucceeds(updateDoc(doc(stale, "module", "paid"), { price: 45 }));
  });
});
