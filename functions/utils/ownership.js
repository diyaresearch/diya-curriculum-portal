/**
 * Document ownership and admin resolution (issue #424).
 *
 * Ownership is recorded inconsistently across this codebase, and the field
 * names alone are not enough to tell you what a value means:
 *
 *   module / lesson   `author`, sometimes `authorId`  — a uid
 *   content (client)  `User` is a uid, `Author` is a *display name*
 *   content (server)  `Author` is a uid
 *
 * So `Author === req.user.uid` — the obvious check — silently locks users out
 * of their own client-created content, because it compares a uid to a name.
 * resolveOwnerUid() prefers the unambiguous fields and only accepts `Author`
 * when the value actually looks like a uid.
 *
 * Cleaning up the underlying inconsistency is #429's job; this keeps
 * authorization correct in the meantime.
 */

const { databaseService } = require("../services/databaseService");

const TABLE_USERS = "users";

// Ordered by how unambiguous they are.
const UID_FIELDS = ["User", "author", "authorId", "userId", "createdBy", "uid"];

// Firebase uids are 28 URL-safe characters; display names are not.
const UID_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

function looksLikeUid(value) {
  return typeof value === "string" && UID_PATTERN.test(value) && !value.includes(" ");
}

/**
 * Best-effort owner uid for a document.
 * @returns {string|null} null when the document records no usable owner
 */
function resolveOwnerUid(data) {
  if (!data || typeof data !== "object") return null;

  for (const field of UID_FIELDS) {
    if (looksLikeUid(data[field])) return data[field];
  }

  // `Author` last: it holds a uid on server-created documents and a display
  // name on client-created ones, so accept it only when it looks like a uid.
  if (looksLikeUid(data.Author)) return data.Author;

  return null;
}

/** True when the uid belongs to an admin. Costs one user-document read. */
async function isAdminUser(uid) {
  if (!uid) return false;
  try {
    await databaseService.initialize();
    const { snap } = await databaseService.getUserDocument(uid, TABLE_USERS);
    return Boolean(snap && snap.exists && snap.data().role === "admin");
  } catch (error) {
    // Fail closed: an unresolvable role is not an admin.
    console.error("[ownership] admin lookup failed:", error.message);
    return false;
  }
}

/**
 * May this request mutate this document?
 *
 * Owners may. Admins may. A document that records no owner is editable only by
 * an admin — that is deliberate: a missing owner is not an invitation.
 *
 * @returns {Promise<boolean>}
 */
async function canMutate(req, data) {
  const uid = req.user && req.user.uid;
  if (!uid) return false;

  const ownerUid = resolveOwnerUid(data);
  if (ownerUid && ownerUid === uid) return true;

  return isAdminUser(uid);
}

module.exports = {
  resolveOwnerUid,
  looksLikeUid,
  isAdminUser,
  canMutate,
};
