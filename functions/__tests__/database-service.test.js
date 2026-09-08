/**
 * services/databaseService.js — the layer everything else reads Firestore
 * through, which until #396 had no unit tests of its own.
 *
 * Two things are pinned here. The first is initialization: it used to guard
 * only on `this.isInitialized`, a boolean set *after* the async body finished,
 * so every request arriving during a cold start began its own initialization.
 * The second is the contract the rest of the backend now depends on — that
 * getDb()/getAdmin() are usable once initialize() has resolved, that a failed
 * initialization is not cached, and that Firestore errors leave this layer as
 * translated errors carrying a statusCode rather than raw driver errors.
 */

const { DatabaseService } = require("../services/databaseService");

/** A promise plus its resolvers, for holding an initialization open. */
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Stub the real credential work; record how often it was entered. */
function stubInitialization(service, body) {
  return jest.spyOn(service, "performInitialization").mockImplementation(async () => {
    if (body) await body();
    service.isInitialized = true;
  });
}

let consoleError;

beforeEach(() => {
  // handleFirebaseError logs every translated error; the tests below
  // deliberately produce several.
  consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
  jest.restoreAllMocks();
});

describe("initialize", () => {
  test("concurrent callers share a single initialization", async () => {
    const service = new DatabaseService();
    const gate = deferred();
    const perform = stubInitialization(service, () => gate.promise);

    const callers = Promise.all([
      service.initialize(),
      service.initialize(),
      service.initialize(),
    ]);

    // All three are now waiting on the same in-flight promise. Before #396
    // each would have started its own admin.initializeApp() race, because
    // isInitialized is only true once the body has finished.
    expect(perform).toHaveBeenCalledTimes(1);

    gate.resolve();
    await callers;

    expect(perform).toHaveBeenCalledTimes(1);
    expect(service.isInitialized).toBe(true);
  });

  test("is a no-op once initialized", async () => {
    const service = new DatabaseService();
    const perform = stubInitialization(service);

    await service.initialize();
    await service.initialize();
    await service.initialize();

    expect(perform).toHaveBeenCalledTimes(1);
  });

  test("a failed initialization is not cached — the next caller retries", async () => {
    const service = new DatabaseService();
    const perform = jest
      .spyOn(service, "performInitialization")
      .mockRejectedValueOnce(new Error("no credential source configured"))
      .mockImplementation(async () => {
        service.isInitialized = true;
      });

    await expect(service.initialize()).rejects.toThrow("no credential source configured");

    // A credential that was missing at boot may be present a moment later
    // (Secret Manager binding, emulator starting). Caching the rejection
    // would leave the process permanently dead.
    await service.initialize();

    expect(perform).toHaveBeenCalledTimes(2);
    expect(service.isInitialized).toBe(true);
  });

  test("every concurrent caller sees the failure, not just the first", async () => {
    const service = new DatabaseService();
    const gate = deferred();
    jest.spyOn(service, "performInitialization").mockImplementation(() => gate.promise);

    const callers = [service.initialize(), service.initialize()];
    gate.reject(new Error("credential is dead"));

    await expect(callers[0]).rejects.toThrow("credential is dead");
    await expect(callers[1]).rejects.toThrow("credential is dead");
  });
});

describe("accessors before initialization", () => {
  test("getDb() and getAdmin() refuse to hand back a half-built service", () => {
    const service = new DatabaseService();

    expect(() => service.getDb()).toThrow(/not initialized/i);
    expect(() => service.getAdmin()).toThrow(/not initialized/i);
  });

  test("both are usable once initialize() has resolved", async () => {
    const service = new DatabaseService();
    stubInitialization(service, () => {
      service.db = { collection: () => {} };
      service.admin = { auth: () => {} };
    });

    await service.initialize();

    expect(service.getDb()).toBe(service.db);
    expect(service.getAdmin()).toBe(service.admin);
  });
});

describe("safeOperation", () => {
  test("passes a successful result straight through", async () => {
    const service = new DatabaseService();
    await expect(service.safeOperation(async () => "value", "Reading")).resolves.toBe("value");
  });

  test("translates a Firestore error into one carrying a status", async () => {
    const service = new DatabaseService();
    const denied = Object.assign(new Error("Missing or insufficient permissions"), {
      code: "permission-denied",
    });

    await expect(
      service.safeOperation(async () => {
        throw denied;
      }, "Getting user document")
    ).rejects.toMatchObject({
      statusCode: 403,
      errorCode: "DATABASE_PERMISSION_DENIED",
      originalError: denied,
    });
  });

  test("names the failing operation in the log", async () => {
    const service = new DatabaseService();

    await expect(
      service.safeOperation(async () => {
        throw new Error("boom");
      }, "Getting all users")
    ).rejects.toThrow();

    expect(consoleError).toHaveBeenCalledWith(
      "Getting all users failed:",
      expect.any(Error)
    );
  });
});

describe("getUserDocument", () => {
  function serviceWithUsers(users) {
    const service = new DatabaseService();
    stubInitialization(service, () => {
      service.db = {
        collection: (name) => ({
          doc: (id) => ({
            id,
            get: async () => ({
              exists: Object.prototype.hasOwnProperty.call(users, id),
              data: () => users[id],
            }),
            path: `${name}/${id}`,
          }),
        }),
      };
    });
    return service;
  }

  test("returns the ref, the snapshot and the collection it came from", async () => {
    const service = serviceWithUsers({ "uid-1": { role: "admin" } });
    await service.initialize();

    const { ref, snap, collection } = await service.getUserDocument("uid-1", "users");

    expect(collection).toBe("users");
    expect(ref.path).toBe("users/uid-1");
    expect(snap.exists).toBe(true);
    expect(snap.data()).toEqual({ role: "admin" });
  });

  test("reports a missing user as a non-existent snapshot, not an error", async () => {
    const service = serviceWithUsers({});
    await service.initialize();

    const { snap } = await service.getUserDocument("nobody", "users");
    expect(snap.exists).toBe(false);
  });

  test("initializes on demand when called on a cold service", async () => {
    const service = serviceWithUsers({ "uid-1": {} });
    const perform = jest.spyOn(service, "performInitialization");

    // No initialize() call of its own: the service methods keep this guard so
    // a caller outside the Express pipeline (utils/ownership.js, a script)
    // still works.
    await service.getUserDocument("uid-1", "users");

    expect(perform).toHaveBeenCalledTimes(1);
  });
});

describe("user document writes", () => {
  function serviceWithAdmin(admin) {
    const written = {};
    const service = new DatabaseService();
    stubInitialization(service, () => {
      service.admin = admin;
      service.db = {
        collection: () => ({
          doc: (id) => ({
            id,
            set: async (data) => {
              written.set = data;
            },
            update: async (data) => {
              written.update = data;
            },
          }),
        }),
      };
    });
    return { service, written };
  }

  const realAdmin = { firestore: { FieldValue: { serverTimestamp: () => "SERVER_TIME" } } };

  test("setUserDocument stamps createdAt and updatedAt from the server clock", async () => {
    const { service, written } = serviceWithAdmin(realAdmin);
    await service.initialize();

    await service.setUserDocument("uid-1", "users", { email: "a@b.c" });

    expect(written.set).toEqual({
      email: "a@b.c",
      createdAt: "SERVER_TIME",
      updatedAt: "SERVER_TIME",
    });
  });

  test("updateUserDocument stamps updatedAt and leaves createdAt alone", async () => {
    const { service, written } = serviceWithAdmin(realAdmin);
    await service.initialize();

    await service.updateUserDocument("uid-1", "users", { fullName: "A B" });

    expect(written.update).toEqual({ fullName: "A B", updatedAt: "SERVER_TIME" });
  });

  test("falls back to a local Date under an admin without a FieldValue namespace", async () => {
    // Mock mode, and several hand-rolled admin doubles in this suite.
    const { service, written } = serviceWithAdmin({ auth: () => ({}) });
    await service.initialize();

    await service.updateUserDocument("uid-1", "users", { fullName: "A B" });

    expect(written.update.updatedAt).toBeInstanceOf(Date);
  });
});

describe("getInfo", () => {
  test("reports initialization and mock state", async () => {
    const service = new DatabaseService();
    expect(service.getInfo()).toMatchObject({ initialized: false, mockMode: false });

    stubInitialization(service, () => {
      service.isMocked = true;
    });
    await service.initialize();

    expect(service.getInfo()).toMatchObject({ initialized: true, mockMode: true });
  });
});
