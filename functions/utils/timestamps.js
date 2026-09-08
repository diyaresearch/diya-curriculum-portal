/**
 * Firestore timestamp helpers (issue #396).
 *
 * Write sites used to spell the defensive form out by hand, once per field:
 *
 *   timestamp: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date()
 *
 * The optional chaining is not decoration. `admin` here is whatever
 * databaseService.getAdmin() returned — the real firebase-admin module in a
 * deploy, utils/firebaseMock.js locally and in tests, and a hand-rolled stub
 * in several unit tests — and the mocks have historically carried only the
 * parts of the FieldValue namespace their callers needed. A bare
 * admin.firestore.FieldValue.serverTimestamp() throws under those.
 *
 * Centralising it means the fallback behaves the same at all ~25 call sites
 * instead of depending on which ones remembered the guards.
 */

/**
 * A server-side write timestamp, falling back to the local clock.
 *
 * The fallback is a real Date rather than a sentinel, so a document written
 * through a mock admin still reads back as a date. Firestore resolves the
 * sentinel at commit time; the fallback is resolved here. Callers that need
 * the two to be interchangeable already treat the field as opaque.
 *
 * @param {Object} admin - firebase-admin module or a mock exposing .firestore
 * @returns {Object|Date} FieldValue sentinel, or a Date when unavailable
 */
function serverTimestamp(admin) {
  return admin?.firestore?.FieldValue?.serverTimestamp?.() || new Date();
}

/**
 * A Firestore Timestamp for a known Date — subscription end dates and the
 * like, which are computed here rather than stamped by the server.
 *
 * @param {Object} admin - firebase-admin module or a mock exposing .firestore
 * @param {Date} date - the date to convert
 * @returns {Object|Date} Firestore Timestamp, or the Date when unavailable
 */
function timestampFromDate(admin, date) {
  return admin?.firestore?.Timestamp?.fromDate?.(date) || date;
}

module.exports = { serverTimestamp, timestampFromDate };
