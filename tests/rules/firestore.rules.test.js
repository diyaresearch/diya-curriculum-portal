/**
 * Firestore security rules tests (issues #419, #420, #382).
 *
 * Run with:  npm --prefix tests/rules test
 * Requires the Firestore emulator, which the test script starts.
 */

const fs = require("fs");
const path = require("path");
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } = require("firebase/firestore");

const RULES = fs.readFileSync(
  path.join(__dirname, "..", "..", "portal-app", "firestore.rules"),
  "utf8"
);

const ALICE = "alice-uid";
const BOB = "bob-uid";

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "rules-test-curriculum-portal",
    firestore: { rules: RULES, host: "127.0.0.1", port: 8080 },
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Seed documents through a context that bypasses rules, mirroring the
  // Admin SDK writes the API performs.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users", ALICE), { email: "alice@example.com", role: "teacherDefault" });
    await setDoc(doc(db, "prod.users", ALICE), { email: "alice@example.com", role: "teacherDefault" });
    await setDoc(doc(db, "teachers", ALICE), { email: "alice@example.com", role: "teacherDefault" });
    await setDoc(doc(db, "students", ALICE), { email: "alice@example.com", role: "student" });
    await setDoc(doc(db, "prod.module", "m1"), { title: "Public module", price: 10 });
    await setDoc(doc(db, "testimonials", "t1"), { quote: "Real testimonial" });
    await setDoc(doc(db, "prod.payment_logs", "p1"), { amount: 999 });
    await setDoc(doc(db, "prod.subscriptions", "s1"), { plan: "teacherPlus" });
  });
});

const anon = () => testEnv.unauthenticatedContext().firestore();
const as = (uid) => testEnv.authenticatedContext(uid).firestore();

describe("#420 — user profiles are not world-readable", () => {
  test("unauthenticated read of users/{id} is denied", async () => {
    await assertFails(getDoc(doc(anon(), "users", ALICE)));
  });

  test("unauthenticated read of prod.users/{id} is denied", async () => {
    await assertFails(getDoc(doc(anon(), "prod.users", ALICE)));
  });

  test("unauthenticated listing of the users collection is denied", async () => {
    await assertFails(getDocs(collection(anon(), "users")));
  });

  test("a signed-in user cannot read another user's profile", async () => {
    await assertFails(getDoc(doc(as(BOB), "users", ALICE)));
    await assertFails(getDoc(doc(as(BOB), "prod.users", ALICE)));
  });

  test("a signed-in user can read their own profile", async () => {
    await assertSucceeds(getDoc(doc(as(ALICE), "users", ALICE)));
    await assertSucceeds(getDoc(doc(as(ALICE), "prod.users", ALICE)));
  });
});

describe("#419 — no privilege escalation via user documents", () => {
  test("a non-owner write to users/{other} is denied", async () => {
    await assertFails(setDoc(doc(as(BOB), "users", ALICE), { role: "admin" }));
    await assertFails(setDoc(doc(as(BOB), "prod.users", ALICE), { role: "admin" }));
  });

  test("even an owner cannot write their own users doc — the API owns it", async () => {
    await assertFails(updateDoc(doc(as(ALICE), "users", ALICE), { role: "admin" }));
    await assertFails(updateDoc(doc(as(ALICE), "prod.users", ALICE), { fullName: "Alice" }));
  });

  test("an owner cannot promote themselves via their teachers doc", async () => {
    await assertFails(updateDoc(doc(as(ALICE), "teachers", ALICE), { role: "admin" }));
    await assertFails(updateDoc(doc(as(ALICE), "teachers", ALICE), { role: "teacherPlus" }));
  });

  test("an owner cannot grant themselves a subscription", async () => {
    await assertFails(
      updateDoc(doc(as(ALICE), "teachers", ALICE), { subscriptionType: "teacherPlus" })
    );
    await assertFails(
      updateDoc(doc(as(ALICE), "teachers", ALICE), { subscriptionStatus: "active" })
    );
  });

  test("an owner may still edit non-privileged profile fields", async () => {
    await assertSucceeds(
      updateDoc(doc(as(ALICE), "teachers", ALICE), { school: "New School" })
    );
  });

  test("a non-owner cannot write another user's teachers doc", async () => {
    await assertFails(updateDoc(doc(as(BOB), "teachers", ALICE), { school: "Hacked" }));
  });
});

describe("signup still works", () => {
  test("a new teacher can create their own profile with the default role", async () => {
    await assertSucceeds(
      setDoc(doc(as(BOB), "teachers", BOB), {
        fullName: "Bob",
        email: "bob@example.com",
        role: "teacherDefault",
      })
    );
  });

  test("a new student can create their own profile with the default role", async () => {
    await assertSucceeds(
      setDoc(doc(as(BOB), "students", BOB), {
        fullName: "Bob",
        email: "bob@example.com",
        role: "student",
      })
    );
  });

  test("signing up as an admin is denied", async () => {
    await assertFails(
      setDoc(doc(as(BOB), "teachers", BOB), { fullName: "Bob", role: "admin" })
    );
  });

  test("signing up with a subscription already granted is denied", async () => {
    await assertFails(
      setDoc(doc(as(BOB), "teachers", BOB), {
        fullName: "Bob",
        role: "teacherDefault",
        subscriptionType: "teacherPlus",
      })
    );
  });

  test("creating a profile under someone else's uid is denied", async () => {
    await assertFails(
      setDoc(doc(as(BOB), "teachers", ALICE), { fullName: "Bob", role: "teacherDefault" })
    );
  });
});

describe("public content stays readable — the landing page depends on it", () => {
  test("anonymous users can read modules", async () => {
    await assertSucceeds(getDoc(doc(anon(), "prod.module", "m1")));
    await assertSucceeds(getDocs(collection(anon(), "prod.module")));
  });

  test("anonymous users can read testimonials (#433)", async () => {
    await assertSucceeds(getDocs(collection(anon(), "testimonials")));
  });

  test("testimonials are not client-writable", async () => {
    await assertFails(setDoc(doc(as(ALICE), "testimonials", "t2"), { quote: "Fake" }));
  });

  test("a signed-in user can still author content", async () => {
    await assertSucceeds(
      setDoc(doc(as(ALICE), "prod.module", "m2"), { title: "Mine", author: ALICE })
    );
  });
});

describe("#382 — money and PII collections are server-only", () => {
  test("payment logs are unreadable by clients", async () => {
    await assertFails(getDoc(doc(anon(), "prod.payment_logs", "p1")));
    await assertFails(getDoc(doc(as(ALICE), "prod.payment_logs", "p1")));
  });

  test("payment logs are unwritable by clients", async () => {
    await assertFails(setDoc(doc(as(ALICE), "prod.payment_logs", "p2"), { amount: 1 }));
  });

  test("subscriptions are server-only", async () => {
    await assertFails(getDoc(doc(as(ALICE), "prod.subscriptions", "s1")));
    await assertFails(
      setDoc(doc(as(ALICE), "prod.subscriptions", "s2"), { plan: "teacherPlus" })
    );
  });

  test("counters and enterprise contacts are server-only", async () => {
    await assertFails(getDoc(doc(as(ALICE), "counters", "c1")));
    await assertFails(setDoc(doc(as(ALICE), "enterprise_contacts", "e1"), { email: "x@y.z" }));
  });

  test("a collection with no rule is denied by default", async () => {
    await assertFails(getDoc(doc(as(ALICE), "some_unlisted_collection", "x")));
  });

  test("profile documents cannot be deleted by their owner", async () => {
    await assertFails(deleteDoc(doc(as(ALICE), "teachers", ALICE)));
  });
});
