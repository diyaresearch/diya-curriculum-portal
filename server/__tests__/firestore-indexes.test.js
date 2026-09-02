/**
 * firestore.indexes.json must declare the composite indexes the app's
 * queries actually require (issue #434). It used to be `{ indexes: [],
 * fieldOverrides: [] }` — any index that existed in production was created
 * ad hoc from a console link and would not survive rebuilding the project
 * from this repo.
 *
 * The schema qualifier was retired in #428 — collections are unprefixed
 * everywhere now, so each query needs exactly one declared index.
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

test("payment_logs(userId, timestamp) — server/routes/payment.js history query", () => {
  const idx = findIndex("payment_logs", ["userId", "timestamp"]);
  expect(idx).toBeDefined();
  expect(idx.fields[0].order).toBe("ASCENDING");
  expect(idx.fields[1].order).toBe("DESCENDING");
});

test("users(role, createdAt) — databaseService.getAllUsers filtered pagination", () => {
  const idx = findIndex("users", ["role", "createdAt"]);
  expect(idx).toBeDefined();
  expect(idx.fields[0].order).toBe("ASCENDING");
  expect(idx.fields[1].order).toBe("DESCENDING");
});

test("no orphaned prod.-prefixed indexes remain (qualifier retired in #428)", () => {
  const prodIndexes = indexes.filter((idx) => idx.collectionGroup.startsWith("prod."));
  expect(prodIndexes).toEqual([]);
});
