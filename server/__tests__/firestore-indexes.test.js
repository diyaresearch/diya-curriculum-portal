/**
 * firestore.indexes.json must declare the composite indexes the app's
 * queries actually require (issue #434). It used to be `{ indexes: [],
 * fieldOverrides: [] }` — any index that existed in production was created
 * ad hoc from a console link and would not survive rebuilding the project
 * from this repo.
 *
 * Indexes are declared per literal collection ID, and dev/prod share one
 * Firebase project separated only by the "prod." qualifier (#427), so each
 * query needs an entry for both the unprefixed and "prod."-prefixed name.
 */

const path = require("path");
const indexes = require(path.join(
  __dirname,
  "..",
  "..",
  "portal-app",
  "firestore.indexes.json"
)).indexes;

function findIndex(collectionGroup, fieldPaths) {
  return indexes.find(
    (idx) =>
      idx.collectionGroup === collectionGroup &&
      idx.fields.length === fieldPaths.length &&
      idx.fields.every((f, i) => f.fieldPath === fieldPaths[i])
  );
}

describe("payment_logs(userId, timestamp) — server/routes/payment.js history query", () => {
  test.each(["payment_logs", "prod.payment_logs"])("%s", (collectionGroup) => {
    const idx = findIndex(collectionGroup, ["userId", "timestamp"]);
    expect(idx).toBeDefined();
    expect(idx.fields[0].order).toBe("ASCENDING");
    expect(idx.fields[1].order).toBe("DESCENDING");
  });
});

describe("users(role, createdAt) — databaseService.getAllUsers filtered pagination", () => {
  test.each(["users", "prod.users"])("%s", (collectionGroup) => {
    const idx = findIndex(collectionGroup, ["role", "createdAt"]);
    expect(idx).toBeDefined();
    expect(idx.fields[0].order).toBe("ASCENDING");
    expect(idx.fields[1].order).toBe("DESCENDING");
  });
});
