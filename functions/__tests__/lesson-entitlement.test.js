/**
 * Lesson-level entitlement enforcement (issue #430).
 *
 * #430 gated the module endpoint, so `getModuleById` withholds `lessonPlans`
 * from an unentitled caller. The lessons themselves stayed wide open:
 * `GET /api/lesson/:id` and `GET /api/lessons/:id/download` had no auth, no
 * ownership check and no entitlement check, so knowing a lesson id was enough
 * to read the contents of any paid module - which is exactly the acceptance
 * criterion "direct URL navigation to a paid module's lessons is denied".
 *
 * A lesson carries no back reference to the module that contains it, so the
 * question is asked in reverse: which modules list this lesson in
 * `lessonPlans`, and is any of them paid?
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

const { canAccessLesson, paidModulesContaining } = require("../utils/entitlements.check");

const LESSON_AUTHOR = "lEsSoNaUtHoR1234567890abcdef";
const MODULE_AUTHOR = "mOdUlEaUtHoR1234567890abcdef";
const BUYER = "bUyErGhIjKlMnOpQrStUvWxYz345";
const STRANGER = "sTrAnGeRkLmNoPqRsTuVwXyZ6789";

const TABLES = { modulesTable: "module", entitlementsTable: "entitlements" };

const PAID_LESSON = "lesson-inside-paid-module";
const FREE_LESSON = "lesson-inside-free-module";
const ORPHAN_LESSON = "lesson-in-no-module-at-all";

/**
 * Minimal Firestore stand-in: a `module` collection queryable by
 * `array-contains` on lessonPlans, and an `entitlements` collection of ids.
 */
function fakeDb({ modules = {}, entitlements = new Set() } = {}) {
  const queries = [];
  return {
    queries,
    collection(name) {
      if (name === "entitlements") {
        return {
          doc: (id) => ({ get: async () => ({ exists: entitlements.has(id) }) }),
        };
      }
      if (name === "module") {
        return {
          where(field, op, value) {
            queries.push({ field, op, value });
            const matched = Object.entries(modules).filter(
              ([, data]) =>
                field === "lessonPlans" &&
                op === "array-contains" &&
                Array.isArray(data.lessonPlans) &&
                data.lessonPlans.includes(value)
            );
            return {
              get: async () => ({
                forEach: (fn) =>
                  matched.forEach(([id, data]) => fn({ id, data: () => data })),
              }),
            };
          },
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
  };
}

const MODULES = {
  "paid-module": {
    title: "Paid",
    price: 49,
    author: MODULE_AUTHOR,
    lessonPlans: [PAID_LESSON, "another"],
  },
  "free-module": {
    title: "Free",
    author: MODULE_AUTHOR,
    lessonPlans: [FREE_LESSON],
  },
};

const lesson = (authorId) => ({ title: "A lesson", authorId });

beforeEach(() => {
  global.__roles = {};
});

describe("#430 — which modules gate a lesson", () => {
  test("finds the paid module that lists it", async () => {
    const db = fakeDb({ modules: MODULES });
    const gating = await paidModulesContaining(db, "module", PAID_LESSON);
    expect(gating.map((m) => m.id)).toEqual(["paid-module"]);
  });

  test("a free module does not gate anything", async () => {
    const db = fakeDb({ modules: MODULES });
    expect(await paidModulesContaining(db, "module", FREE_LESSON)).toEqual([]);
  });

  test("queries array-contains rather than scanning every module", async () => {
    const db = fakeDb({ modules: MODULES });
    await paidModulesContaining(db, "module", PAID_LESSON);
    expect(db.queries).toEqual([
      { field: "lessonPlans", op: "array-contains", value: PAID_LESSON },
    ]);
  });

  test("a missing lesson id does not query at all", async () => {
    const db = fakeDb({ modules: MODULES });
    expect(await paidModulesContaining(db, "module", undefined)).toEqual([]);
    expect(db.queries).toEqual([]);
  });
});

describe("#430 — reading a lesson", () => {
  test("a lesson in no module is free to anyone, signed in or not", async () => {
    const db = fakeDb({ modules: MODULES });
    const access = await canAccessLesson(db, TABLES, undefined, ORPHAN_LESSON, lesson(LESSON_AUTHOR));
    expect(access).toEqual({ allowed: true, reason: "free" });
  });

  test("a lesson in a free module is free to anyone", async () => {
    const db = fakeDb({ modules: MODULES });
    const access = await canAccessLesson(db, TABLES, undefined, FREE_LESSON, lesson(LESSON_AUTHOR));
    expect(access.allowed).toBe(true);
  });

  test("an anonymous caller is refused a paid module's lesson", async () => {
    const db = fakeDb({ modules: MODULES });
    const access = await canAccessLesson(db, TABLES, undefined, PAID_LESSON, lesson(LESSON_AUTHOR));
    expect(access).toEqual({ allowed: false, reason: "authentication required" });
  });

  test("a signed-in stranger who has not paid is refused", async () => {
    const db = fakeDb({ modules: MODULES });
    const access = await canAccessLesson(db, TABLES, STRANGER, PAID_LESSON, lesson(LESSON_AUTHOR));
    expect(access).toEqual({ allowed: false, reason: "not purchased" });
  });

  test("the buyer is allowed once the webhook has written the entitlement", async () => {
    const db = fakeDb({
      modules: MODULES,
      entitlements: new Set([`${BUYER}_paid-module`]),
    });
    const access = await canAccessLesson(db, TABLES, BUYER, PAID_LESSON, lesson(LESSON_AUTHOR));
    expect(access).toEqual({ allowed: true, reason: "purchased" });
  });

  test("an entitlement to a different module does not unlock this one", async () => {
    const db = fakeDb({
      modules: MODULES,
      entitlements: new Set([`${BUYER}_some-other-module`]),
    });
    const access = await canAccessLesson(db, TABLES, BUYER, PAID_LESSON, lesson(LESSON_AUTHOR));
    expect(access.allowed).toBe(false);
  });

  test("the lesson's own author reads it even inside someone else's paid module", async () => {
    const db = fakeDb({ modules: MODULES });
    const access = await canAccessLesson(db, TABLES, LESSON_AUTHOR, PAID_LESSON, lesson(LESSON_AUTHOR));
    expect(access).toEqual({ allowed: true, reason: "author" });
  });

  test("the gating module's author reads it without buying their own module", async () => {
    const db = fakeDb({ modules: MODULES });
    const access = await canAccessLesson(db, TABLES, MODULE_AUTHOR, PAID_LESSON, lesson(LESSON_AUTHOR));
    expect(access).toEqual({ allowed: true, reason: "module author" });
  });

  test("an admin reads it", async () => {
    global.__roles = { [STRANGER]: "admin" };
    const db = fakeDb({ modules: MODULES });
    const access = await canAccessLesson(db, TABLES, STRANGER, PAID_LESSON, lesson(LESSON_AUTHOR));
    expect(access).toEqual({ allowed: true, reason: "admin" });
  });

  test("paying for any one of several gating modules is enough", async () => {
    const modules = {
      ...MODULES,
      "second-paid-module": {
        title: "Also paid",
        price: 10,
        author: MODULE_AUTHOR,
        lessonPlans: [PAID_LESSON],
      },
    };
    const db = fakeDb({
      modules,
      entitlements: new Set([`${BUYER}_second-paid-module`]),
    });
    const access = await canAccessLesson(db, TABLES, BUYER, PAID_LESSON, lesson(LESSON_AUTHOR));
    expect(access).toEqual({ allowed: true, reason: "purchased" });
  });
});
