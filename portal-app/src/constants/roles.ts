/**
 * Canonical role values (issues #416, #413).
 *
 * These strings are the source of truth shared with the backend
 * (`functions/utils/customClaims.js` VALID_ROLES). They were previously
 * repeated as bare literals across ~30 components, where a typo silently
 * failed the comparison instead of erroring.
 *
 * `teacherEnterprise` is deliberately absent: the enterprise plan grants
 * `teacherPlus`, so there is no separate enterprise role to check for.
 */
import type { Role } from "@/types/models";

export const ROLES = {
  ADMIN: "admin",
  TEACHER_DEFAULT: "teacherDefault",
  TEACHER_PLUS: "teacherPlus",
  STUDENT_DEFAULT: "studentDefault",
  CONSUMER: "consumer",
} as const satisfies Record<string, Role>;

// `as const satisfies Record<string, Role>` rather than a plain object: the
// const assertion keeps each value as its own literal type (so
// `ROLES.ADMIN` is "admin", not string), while `satisfies` makes this file
// fail to compile if a value here is not one of the roles declared in
// @/types/models - which is what keeps the two definitions from drifting.

/** Teachers who may see the Content Type filter and premium content. */
export const PREMIUM_ROLES = [ROLES.TEACHER_PLUS, ROLES.ADMIN];

/** Every teacher-side role, premium or not. */
export const TEACHER_ROLES = [ROLES.TEACHER_DEFAULT, ROLES.TEACHER_PLUS, ROLES.ADMIN];

/** Roles that browse content rather than author it. */
export const CONSUMER_ROLES = [ROLES.STUDENT_DEFAULT, ROLES.CONSUMER];

/**
 * Roles that no longer exist, mapped to what replaces them.
 *
 * `teacherEnterprise` was removed: it only ever appeared alongside
 * `teacherPlus` in premium checks, and no frontend branch distinguished them.
 * A profile written before the removal still carries the old value, so it is
 * translated on read rather than left to fail every role comparison.
 */
const LEGACY_ROLE_ALIASES: Record<string, string> = {
  teacherEnterprise: ROLES.TEACHER_PLUS,
};

/** Map a stored role onto a current one. Returns null for a missing role. */
export function normalizeRole(role: string | null | undefined): string | null {
  if (!role) return null;
  return LEGACY_ROLE_ALIASES[role] || role;
}
