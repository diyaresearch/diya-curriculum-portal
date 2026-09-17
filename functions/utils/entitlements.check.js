/**
 * Entitlement checks for paid content (issue #430).
 *
 * A module is gated when it carries a positive price. Access requires an
 * entitlement document written by the Stripe webhook, or being the module's
 * author, or being an admin.
 *
 * Lessons are gated by the modules that contain them. There is no flag on a
 * lesson saying "this one is paid for" - a module owns an ordered list of
 * lesson ids in `lessonPlans`, and the lesson document carries no back
 * reference - so `canAccessLesson` asks the question in reverse: which modules
 * list this lesson, and is any of them paid?
 *
 * Gating the module endpoint alone was not enough. `getModuleById` withholds
 * `lessonPlans` from an unentitled caller, but the lesson ids leak through
 * other paths (a module the user used to own, a shared link, the module
 * document being world-readable in Firestore), and `GET /api/lesson/:id`
 * served any lesson to anyone - no auth, no ownership check, no entitlement
 * check. So did the PDF download. That is the hole this closes.
 */

const { isAdminUser, resolveOwnerUid } = require("./ownership");

/** Price a module claims, tolerating the two field spellings in use. */
function modulePrice(moduleData) {
  const raw = moduleData?.price ?? moduleData?.Price ?? 0;
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

/** A module is gated only when someone would have to pay for it. */
function isPaidModule(moduleData) {
  return modulePrice(moduleData) > 0;
}

/**
 * May this user see a module's contents?
 *
 * @returns {Promise<{allowed: boolean, reason: string}>}
 */
async function canAccessModule(db, entitlementsTable, userId, moduleId, moduleData) {
  if (!isPaidModule(moduleData)) {
    return { allowed: true, reason: "free" };
  }

  if (!userId) {
    return { allowed: false, reason: "authentication required" };
  }

  if (resolveOwnerUid(moduleData) === userId) {
    return { allowed: true, reason: "author" };
  }

  const snap = await db.collection(entitlementsTable).doc(`${userId}_${moduleId}`).get();
  if (snap.exists) {
    return { allowed: true, reason: "purchased" };
  }

  if (await isAdminUser(userId)) {
    return { allowed: true, reason: "admin" };
  }

  return { allowed: false, reason: "not purchased" };
}


/**
 * Modules that list this lesson and charge for it.
 *
 * `array-contains` on `lessonPlans` needs only the single-field index
 * Firestore maintains automatically for array fields, so this adds nothing to
 * firestore.indexes.json.
 *
 * @returns {Promise<Array<{id: string, data: Object}>>}
 */
async function paidModulesContaining(db, modulesTable, lessonId) {
  if (!lessonId) return [];

  const snap = await db
    .collection(modulesTable)
    .where("lessonPlans", "array-contains", lessonId)
    .get();

  const gating = [];
  snap.forEach((doc) => {
    const data = doc.data();
    if (isPaidModule(data)) {
      gating.push({ id: doc.id, data });
    }
  });
  return gating;
}

/**
 * May this user read a lesson's contents?
 *
 * A lesson no paid module contains is free, which is the overwhelmingly common
 * case and costs one query. Everything else needs the caller identified.
 *
 * @param {Object} db
 * @param {{modulesTable: string, entitlementsTable: string}} tables
 * @param {string|undefined} userId
 * @param {string} lessonId
 * @param {Object} lessonData
 * @returns {Promise<{allowed: boolean, reason: string}>}
 */
async function canAccessLesson(db, tables, userId, lessonId, lessonData) {
  const { modulesTable, entitlementsTable } = tables;

  // The person who wrote it can always read it, even while it sits inside
  // somebody else's paid module.
  if (userId && resolveOwnerUid(lessonData) === userId) {
    return { allowed: true, reason: "author" };
  }

  const gating = await paidModulesContaining(db, modulesTable, lessonId);
  if (gating.length === 0) {
    return { allowed: true, reason: "free" };
  }

  if (!userId) {
    return { allowed: false, reason: "authentication required" };
  }

  // Entitled to, or the author of, *any* module that gates it. A lesson can
  // appear in several modules; paying for one of them is enough.
  for (const module of gating) {
    if (resolveOwnerUid(module.data) === userId) {
      return { allowed: true, reason: "module author" };
    }
  }

  for (const module of gating) {
    const snap = await db
      .collection(entitlementsTable)
      .doc(`${userId}_${module.id}`)
      .get();
    if (snap.exists) {
      return { allowed: true, reason: "purchased" };
    }
  }

  if (await isAdminUser(userId)) {
    return { allowed: true, reason: "admin" };
  }

  return { allowed: false, reason: "not purchased" };
}

module.exports = {
  modulePrice,
  isPaidModule,
  canAccessModule,
  canAccessLesson,
  paidModulesContaining,
};
