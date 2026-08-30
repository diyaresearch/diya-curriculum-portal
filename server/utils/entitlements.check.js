/**
 * Entitlement checks for module access (issue #430).
 *
 * A module is gated when it carries a positive price. Access requires an
 * entitlement document written by the Stripe webhook, or being the module's
 * author, or being an admin.
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

module.exports = { modulePrice, isPaidModule, canAccessModule };
