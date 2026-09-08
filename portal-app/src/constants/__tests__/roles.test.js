/**
 * The role values are shared with the backend (functions/utils/customClaims.js
 * VALID_ROLES). These tests pin the two things that would otherwise break
 * silently: the literal strings, and the legacy alias that keeps profiles
 * written before teacherEnterprise was removed from failing every check.
 */
import { describe, expect, test } from "vitest";

import { ROLES, PREMIUM_ROLES, normalizeRole } from "@/constants/roles";

describe("ROLES", () => {
  test("the literals match what the backend stores", () => {
    expect(ROLES).toEqual({
      ADMIN: "admin",
      TEACHER_DEFAULT: "teacherDefault",
      TEACHER_PLUS: "teacherPlus",
      STUDENT_DEFAULT: "studentDefault",
      CONSUMER: "consumer",
    });
  });

  test("teacherEnterprise is not a role any more", () => {
    expect(Object.values(ROLES)).not.toContain("teacherEnterprise");
  });

  test("premium roles are the ones that may filter by content type", () => {
    expect(PREMIUM_ROLES).toEqual(["teacherPlus", "admin"]);
    expect(PREMIUM_ROLES).not.toContain(ROLES.TEACHER_DEFAULT);
  });
});

describe("normalizeRole", () => {
  test("a legacy teacherEnterprise profile reads as teacherPlus", () => {
    expect(normalizeRole("teacherEnterprise")).toBe(ROLES.TEACHER_PLUS);
  });

  test("current roles pass through unchanged", () => {
    for (const role of Object.values(ROLES)) {
      expect(normalizeRole(role)).toBe(role);
    }
  });

  test("a missing role is null, not undefined or empty string", () => {
    expect(normalizeRole(undefined)).toBeNull();
    expect(normalizeRole(null)).toBeNull();
    expect(normalizeRole("")).toBeNull();
  });
});
