/**
 * Role custom claims (issue #382).
 *
 * The claim is a fast path for rules. It must never be able to cost a user
 * access, so every failure mode here has to degrade to "no claim written".
 */

const { syncRoleClaim, VALID_ROLES } = require("../utils/customClaims");

function fakeAdmin({ existingClaims = null, failOn = null } = {}) {
  const calls = [];
  return {
    calls,
    auth: () => ({
      getUser: async (uid) => {
        if (failOn === "getUser") throw new Error("user lookup failed");
        return { uid, customClaims: existingClaims };
      },
      setCustomUserClaims: async (uid, claims) => {
        if (failOn === "set") throw new Error("claim write failed");
        calls.push({ uid, claims });
      },
    }),
  };
}

describe("syncRoleClaim", () => {
  test("writes the role as a claim", async () => {
    const admin = fakeAdmin();
    await expect(syncRoleClaim(admin, "uid1", "admin")).resolves.toBe(true);
    expect(admin.calls).toEqual([{ uid: "uid1", claims: { role: "admin" } }]);
  });

  test("preserves unrelated existing claims", async () => {
    const admin = fakeAdmin({ existingClaims: { tenant: "acme" } });
    await syncRoleClaim(admin, "uid1", "teacherPlus");
    expect(admin.calls[0].claims).toEqual({ tenant: "acme", role: "teacherPlus" });
  });

  test("skips a write when the claim is already correct", async () => {
    // Rewriting a claim invalidates tokens for no reason.
    const admin = fakeAdmin({ existingClaims: { role: "admin" } });
    await expect(syncRoleClaim(admin, "uid1", "admin")).resolves.toBe(false);
    expect(admin.calls).toHaveLength(0);
  });

  test.each([undefined, null, "", "superuser", "root"])(
    "refuses to write %p as a role",
    async (role) => {
      const admin = fakeAdmin();
      await expect(syncRoleClaim(admin, "uid1", role)).resolves.toBe(false);
      expect(admin.calls).toHaveLength(0);
    }
  );

  test("accepts every role the app actually assigns", async () => {
    for (const role of VALID_ROLES) {
      const admin = fakeAdmin();
      await expect(syncRoleClaim(admin, "uid1", role)).resolves.toBe(true);
    }
  });

  test("a failing claim write never throws — the document stays authoritative", async () => {
    const admin = fakeAdmin({ failOn: "set" });
    await expect(syncRoleClaim(admin, "uid1", "admin")).resolves.toBe(false);
  });

  test("a failing user lookup never throws either", async () => {
    const admin = fakeAdmin({ failOn: "getUser" });
    await expect(syncRoleClaim(admin, "uid1", "admin")).resolves.toBe(false);
  });

  test("mock Firebase (no auth surface) is tolerated", async () => {
    await expect(syncRoleClaim({}, "uid1", "admin")).resolves.toBe(false);
    await expect(syncRoleClaim({ auth: () => ({}) }, "uid1", "admin")).resolves.toBe(false);
  });

  test("a missing uid is refused", async () => {
    const admin = fakeAdmin();
    await expect(syncRoleClaim(admin, null, "admin")).resolves.toBe(false);
    expect(admin.calls).toHaveLength(0);
  });
});
