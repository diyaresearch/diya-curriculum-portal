/**
 * The shapes this app reads out of Firestore and the API (#365).
 *
 * These describe documents that already exist, so they are written the way
 * the data actually is rather than the way it ought to be:
 *
 *   - Almost every field is optional. Firestore has no schema, these
 *     collections predate any validation, and a document written before a
 *     field existed simply does not have it. Marking a field required here
 *     would type away a `undefined` the UI genuinely has to handle.
 *   - The `content` collection uses Capitalized field names and `lesson` /
 *     `module` use camelCase. That is a real inconsistency in the stored
 *     data (see functions/controllers/), not a typo here - which is
 *     precisely the kind of thing these types exist to stop a caller
 *     guessing at.
 *   - Timestamps come back as three different things depending on the path
 *     that wrote them: a Firestore Timestamp from the client SDK, an ISO
 *     string from the lesson routes, and a Date from modulesController. Hence
 *     `FirestoreDate`.
 *
 * Source of truth for each shape is named above it. When a controller
 * changes, change the type with it.
 */

import type { Timestamp } from "firebase/firestore";

/** What a timestamp field can hold, given the three writers above. */
export type FirestoreDate = Timestamp | Date | string;

/** Every document is read with its id merged in by the reading code. */
export interface WithId {
  id: string;
}

/* -------------------------------------------------------------------------
 * users - functions/routes/user.js
 * ---------------------------------------------------------------------- */

/**
 * Role strings as stored. Kept structurally identical to `ROLES` in
 * @/constants/roles, which is the value-level source of truth shared with
 * the backend's VALID_ROLES.
 *
 * `teacherEnterprise` is absent deliberately - it was retired, and
 * `normalizeRole` maps a stored one onto `teacherPlus` on read.
 */
export type Role = "admin" | "teacherDefault" | "teacherPlus" | "studentDefault" | "consumer";

export type SubscriptionType = "basic" | "premium" | "enterprise" | string;
export type SubscriptionStatus = "active" | "cancelled" | "expired" | string;

export interface UserDocument {
  email?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  institution?: string;
  /** "educator" | "student" as written at registration; free text in practice. */
  userType?: string;
  jobTitle?: string;
  subjects?: string[];
  /** May hold a retired value; read it through `normalizeRole`. */
  role?: string;
  subscriptionType?: SubscriptionType;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionStartDate?: FirestoreDate;
  subscriptionEndDate?: FirestoreDate;
  stripeCustomerId?: string;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

/* -------------------------------------------------------------------------
 * content - functions/controllers/unitsController.js
 *
 * "Units" in the API, "nuggets" in the UI, `content` in Firestore. The
 * Capitalized keys are what the controller writes.
 * ---------------------------------------------------------------------- */

export interface UnitDocument {
  Title?: string;
  Category?: string;
  Type?: string;
  Level?: string;
  Duration?: string | number;
  /** Sanitized HTML from the rich-text editor. */
  Abstract?: string;
  fileUrl?: string;
  isPublic?: boolean;
  /** Firebase uid, stamped from the caller's token, never from the body. */
  Author?: string;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export type Unit = UnitDocument & WithId;

/* -------------------------------------------------------------------------
 * lesson - functions/controllers/lessonsController.js
 * ---------------------------------------------------------------------- */

/** One block of a lesson plan. `intro` is sanitized HTML. */
export interface LessonSection {
  title?: string;
  intro?: string;
  contentIds?: string[];
  [key: string]: unknown;
}

export interface LessonDocument {
  title?: string;
  category?: string;
  type?: string;
  level?: string;
  duration?: string | number;
  objectives?: string[];
  sections?: LessonSection[];
  /** Sanitized HTML. */
  description?: string;
  isPublic?: boolean;
  /** Firebase uid of the creator. */
  authorId?: string;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export type Lesson = LessonDocument & WithId;

/* -------------------------------------------------------------------------
 * module - functions/controllers/modulesController.js
 * ---------------------------------------------------------------------- */

export interface ModuleDocument {
  title?: string;
  /** Sanitized HTML. */
  description?: string;
  tags?: string[];
  /** Lesson document ids, in display order. */
  lessonPlans?: string[];
  image?: string;
  /** Firebase uid of the creator. */
  author?: string;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export type Module = ModuleDocument & WithId;

/**
 * A module the caller may not open yet. `getModules` substitutes this for the
 * document body when an entitlement check fails, so a locked module still
 * appears in a listing without leaking its contents.
 */
export interface LockedModule extends WithId {
  locked: true;
  entitlementRequired: true;
  accessReason?: string;
}

export type ModuleListEntry = Module | LockedModule;

/** Narrow a listing entry before reading any module field. */
export function isLockedModule(entry: ModuleListEntry): entry is LockedModule {
  return (entry as LockedModule).locked === true;
}
