/**
 * teacherEnterprise was removed as a role. Profiles written before that still
 * carry the value, so every read path has to translate it rather than deny the
 * user access they paid for.
 */
const { normalizeRole, VALID_ROLES } = require("../utils/customClaims");
const { roleForPlan } = require("../utils/entitlements");

describe("normalizeRole", () => {
  test("a legacy teacherEnterprise profile reads as teacherPlus", () => {
    expect(normalizeRole("teacherEnterprise")).toBe("teacherPlus");
  });

  test("current roles pass through unchanged", () => {
    for (const role of VALID_ROLES) {
      expect(normalizeRole(role)).toBe(role);
    }
  });

  test("a missing role is left alone for the caller to default", () => {
    expect(normalizeRole(undefined)).toBeUndefined();
    expect(normalizeRole("")).toBe("");
  });
});

describe("teacherEnterprise is gone", () => {
  test("it is not an assignable role", () => {
    expect(VALID_ROLES).not.toContain("teacherEnterprise");
  });

  test("no plan grants it", () => {
    expect(roleForPlan("enterprise")).toBe("teacherPlus");
    expect(roleForPlan("premium")).toBe("teacherPlus");
  });
});
