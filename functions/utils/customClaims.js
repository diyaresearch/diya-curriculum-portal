/**
 * Role as a Firebase custom claim (issue #382).
 *
 * Rules had no way to check a role without reading the user's profile
 * document, so isAdmin() cost up to three exists()+get() pairs per evaluation.
 * A custom claim rides in the ID token and is free to check.
 *
 * The claim is a FAST PATH, never the only path. Rules still fall back to the
 * profile document, because:
 *
 *   - a claim only reaches the client on the next token refresh (up to an
 *     hour, or immediately via getIdToken(true)), so a role change is not
 *     instantaneous in the token;
 *   - users who predate this have no claim until something syncs them;
 *   - setCustomUserClaims can fail, and a failure must not cost someone their
 *     access.
 *
 * So the claim can only ever grant access sooner or cheaper — never withhold
 * it. That is what makes rolling this out safe.
 */

const VALID_ROLES = ["admin", "teacherDefault", "teacherPlus", "studentDefault"];

/**
 * Roles that no longer exist, mapped to what replaces them.
 *
 * `teacherEnterprise` was removed: it only ever appeared next to `teacherPlus`
 * in premium checks and nothing distinguished the two. Profiles written before
 * the removal still carry the old value, so it is translated on read instead
 * of silently failing every role check.
 */
const LEGACY_ROLE_ALIASES = { teacherEnterprise: "teacherPlus" };

/** Map a stored role onto a current one. */
function normalizeRole(role) {
  if (!role) return role;
  return LEGACY_ROLE_ALIASES[role] || role;
}

/**
 * Mirror a user's role into their custom claims.
 *
 * Never throws: a claim that fails to sync leaves the document as the source
 * of truth, which still works.
 *
 * @returns {Promise<boolean>} whether the claim was written
 */
async function syncRoleClaim(admin, uid, role) {
  if (!uid || !role || !VALID_ROLES.includes(role)) {
    return false;
  }

  try {
    const auth = typeof admin.auth === "function" ? admin.auth() : null;
    if (!auth || typeof auth.setCustomUserClaims !== "function") {
      return false; // mock Firebase in development and tests
    }

    const user = await auth.getUser(uid);
    if (user.customClaims && user.customClaims.role === role) {
      return false; // already correct; avoid a pointless token invalidation
    }

    await auth.setCustomUserClaims(uid, { ...(user.customClaims || {}), role });
    console.log(`[claims] role="${role}" synced for uid ${uid}`);
    return true;
  } catch (error) {
    console.warn(`[claims] could not sync role for uid ${uid}: ${error.message}`);
    return false;
  }
}

module.exports = { syncRoleClaim, normalizeRole, VALID_ROLES };
