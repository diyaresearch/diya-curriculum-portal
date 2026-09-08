/**
 * The controller conventions, enforced (issue #366).
 *
 * `functions/controllers/` held five files in three shapes: two snake_case
 * ones named after the request that reached them (`content_submission.js`,
 * `update_submission.js`), a singular `moduleController.js`, and two plural
 * `*Controller.js`. The units resource was spread across three of them, so
 * its validation, its ownership check and its error handling each lived
 * somewhere different and drifted with nothing to line them up against.
 *
 * The conventions are written out in controllers/README.md. This scans source
 * rather than behaviour because that is the only thing that catches the *next*
 * controller: a new file in the old shape passes every behavioural test in
 * this suite while putting the directory straight back where it started.
 */

const fs = require("fs");
const path = require("path");

const CONTROLLERS = path.join(__dirname, "..", "controllers");

/** Comments in these files quote the old patterns; only real code counts. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const files = fs
  .readdirSync(CONTROLLERS)
  .filter((name) => name.endsWith(".js"))
  .map((name) => ({
    name,
    source: stripComments(fs.readFileSync(path.join(CONTROLLERS, name), "utf8")),
    exports: require(path.join(CONTROLLERS, name)),
  }));

test("the directory is not empty (a passing scan of nothing proves nothing)", () => {
  expect(files.length).toBeGreaterThanOrEqual(3);
});

describe("naming", () => {
  test("every controller is <resource>Controller.js, camelCase", () => {
    const offenders = files.filter(({ name }) => !/^[a-z][a-zA-Z0-9]*Controller\.js$/.test(name));
    expect(offenders.map((f) => f.name)).toEqual([]);
  });

  test("nothing but .js controllers and the README live here", () => {
    const unexpected = fs
      .readdirSync(CONTROLLERS)
      .filter((name) => name !== "README.md" && !name.endsWith(".js"));
    expect(unexpected).toEqual([]);
  });

  test("every exported handler is a camelCase function", () => {
    for (const { name, exports } of files) {
      const entries = Object.entries(exports);
      expect(entries.length).toBeGreaterThan(0);

      for (const [exportName, handler] of entries) {
        expect(`${name}: ${exportName}`).toMatch(/: [a-z][a-zA-Z0-9]*$/);
        expect(typeof handler).toBe("function");
      }
    }
  });
});

describe("shape", () => {
  test("handlers are functions, not classes", () => {
    const offenders = files.filter(({ source }) => /\bclass\s+\w+/.test(source));
    expect(offenders.map((f) => f.name)).toEqual([]);
  });

  test("no promise chains — async/await throughout", () => {
    const offenders = files.filter(({ source }) => /\.then\s*\(/.test(source));
    expect(offenders.map((f) => f.name)).toEqual([]);
  });
});

describe("Firestore access", () => {
  test("comes from databaseService, not a module-load firebaseConfig import", () => {
    // config/firebaseConfig resolves a real credential the moment it is
    // required, which defeats ENABLE_MOCK_FIREBASE and is why CI had to hand
    // the API an emulator address just to boot the app.
    const offenders = files.filter(({ source }) => /require\(['"]\.\.\/config\/firebaseConfig['"]\)/.test(source));
    expect(offenders.map((f) => f.name)).toEqual([]);
  });

  test("no controller initializes the database itself", () => {
    // middleware/ensureDatabase.js does it once, ahead of every router (#396).
    const offenders = files.filter(({ source }) => /databaseService\.initialize\s*\(/.test(source));
    expect(offenders.map((f) => f.name)).toEqual([]);
  });
});

describe("error handling", () => {
  test("no controller sends a raw error.message to the client", () => {
    // sendError() passes it as `details`, which createErrorResponse drops in
    // production (#394). res.send(error.message) exposes it everywhere.
    const offenders = files.filter(({ source }) =>
      /res\s*\.?\s*(?:status\([^)]*\)\s*\.)?(?:send|json)\(\s*(?:error|err)\.message/.test(source)
    );
    expect(offenders.map((f) => f.name)).toEqual([]);
  });

  test("every controller reports through responseHelpers", () => {
    const offenders = files.filter(({ source }) => !/require\(['"]\.\.\/utils\/responseHelpers['"]\)/.test(source));
    expect(offenders.map((f) => f.name)).toEqual([]);
  });

  test("ownership checks use utils/ownership rather than a local admin lookup", () => {
    // lessonsController carried two copies of a local `isAdmin` closure that
    // read the users collection directly, while the other controllers called
    // canMutate() — the same rule, written twice, free to disagree.
    const offenders = files.filter(({ source }) => /\bisAdmin\s*=\s*async/.test(source));
    expect(offenders.map((f) => f.name)).toEqual([]);
  });
});
