# Controllers

Request handlers for one resource each. Issue #366: before it, `functions/controllers/`
held five files in three shapes — `content_submission.js` and `update_submission.js`
(snake_case, named after the request that reached them), `moduleController.js` (singular),
and `lessonsController.js` / `unitsController.js` (plural). The units resource was spread
across three of them, which is how the ownership check in one and the validation in another
drifted with nothing to line them up against.

`__tests__/controller-conventions.test.js` enforces what follows.

## The conventions

**One file per resource, named `<resource>Controller.js`.** camelCase, and the resource in
the plural form its routes use: `unitsController.js`, `lessonsController.js`,
`modulesController.js`. Every handler that touches that resource lives in that file — a
handler does not get its own file because it happens to be a POST.

**Functions, not classes.** Each handler is an exported `const name = async (req, res) => {}`.
Helpers that are not handlers stay unexported at the bottom of the file. (`DatabaseService`
is a class because it holds connection state; a controller holds none.)

**Firestore comes from `databaseService`, inside the handler:**

```js
const db = databaseService.getDb();
```

Never `require("../config/firebaseConfig")` at module load. That import resolves a real
credential the moment the file is required, which defeats `ENABLE_MOCK_FIREBASE` and is why
CI had to hand the API an emulator address just to boot (see the `api-integration` job).
`middleware/ensureDatabase.js` guarantees the service is initialized before any handler
runs (#396), so `getDb()` needs no `await` and no initialization call of its own.

**Errors go through `utils/responseHelpers`, never `res.send(error.message)`.** Every
handler wraps its body in one `try`/`catch`; the catch logs and answers with a
resource-scoped code:

| Situation | Helper |
| --- | --- |
| unexpected failure | `sendError(res, "Failed to …", 500, "<RESOURCE>_<ACTION>_ERROR", error.message)` |
| missing document | `sendNotFoundError(res, "Unit")` |
| no/!valid token | `sendAuthError(res, "Authentication required")` |
| authenticated, not allowed | `sendAuthorizationError(res, "You do not have permission to …")` |
| bad input | `sendValidationError(res, "…", [{ field, message }])` |

`createErrorResponse` includes `error.details` outside production only, so passing
`error.message` as the last argument keeps it debuggable in dev without leaking it to
production clients (#394).

**Authorization is `utils/ownership.js`.** `canMutate(req, doc)` is owner-or-admin for any
document; it knows the several field names this codebase records owners under. Do not
re-implement it inline — `lessonsController` carried two copies of a local `isAdmin` closure
until #366.

**`async`/`await` throughout.** No `.then()` chains, no callbacks.

## Template

```js
/**
 * <Resource> — the `<collection>` collection.
 */

const { databaseService } = require("../services/databaseService");
const { canMutate } = require("../utils/ownership");
const {
  sendError,
  sendAuthorizationError,
  sendNotFoundError,
} = require("../utils/responseHelpers");

// Define the collections
const TABLE_THING = "thing";

// Get all things
const getAllThings = async (req, res) => {
  try {
    const db = databaseService.getDb();
    const snapshot = await db.collection(TABLE_THING).get();

    res.status(200).json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    console.error("Error fetching things:", error);
    sendError(res, "Failed to fetch things", 500, "THING_FETCH_ERROR", error.message);
  }
};

// Delete a thing
const deleteThing = async (req, res) => {
  try {
    const db = databaseService.getDb();
    const thingRef = db.collection(TABLE_THING).doc(req.params.id);
    const thingDoc = await thingRef.get();

    if (!thingDoc.exists) {
      return sendNotFoundError(res, "Thing");
    }

    if (!(await canMutate(req, thingDoc.data()))) {
      return sendAuthorizationError(res, "You do not have permission to delete this thing");
    }

    await thingRef.delete();
    res.status(200).json({ message: "Thing deleted successfully" });
  } catch (error) {
    console.error("Error deleting thing:", error);
    sendError(res, "Failed to delete thing", 500, "THING_DELETE_ERROR", error.message);
  }
};

/** Not a handler, so not exported. */
function summarize(doc) {
  return { id: doc.id, title: doc.data().title };
}

module.exports = {
  getAllThings,
  deleteThing,
};
```

Routes stay in `routes/`, which do the mounting and the middleware chain, and import
handlers by name:

```js
const { getAllThings, deleteThing } = require("../controllers/thingsController");

router.get("/things", getAllThings);
router.delete("/thing/:id", authenticateUser, deleteThing);
```
