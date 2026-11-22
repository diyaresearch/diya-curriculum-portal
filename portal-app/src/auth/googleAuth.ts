import {
  getAuth,
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signOut,
  type User,
  type UserCredential,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import type { NavigateFunction } from "react-router-dom";

import { db } from "@/firebase/firebaseConfig";
import { COLLECTIONS } from "@/firebase/collectionNames";
import { api, ApiError } from "@/utils/apiClient";
import { ROLES } from "@/constants/roles";
import type { UserDocument } from "@/types/models";

const RETURN_TO_KEY = "diya_auth:returnTo";
const ACTION_KEY = "diya_auth:action";

/**
 * Work to run once the user comes back from Google, stashed in
 * sessionStorage because a redirect discards everything in memory.
 *
 * Only one kind exists. The payload is the part of the profile the signup
 * form collected; email and fullName come from the Google account itself.
 */
export interface PostAuthAction {
  type: "registerUser";
  payload?: Partial<
    Pick<UserDocument, "userType" | "institution" | "jobTitle" | "subjects" | "firstName" | "lastName">
  >;
}

function safeJsonParse(value: string | null): unknown {
  try {
    return value ? JSON.parse(value) : null;
  } catch (err) {
    console.error("googleAuth: failed to parse JSON from storage", err);
    return null;
  }
}

export function setPostAuthReturnTo(returnTo: string | null | undefined): void {
  if (typeof returnTo === "string" && returnTo.trim()) {
    sessionStorage.setItem(RETURN_TO_KEY, returnTo);
  }
}

export function setPostAuthAction(action: PostAuthAction | null | undefined): void {
  if (!action) return;
  sessionStorage.setItem(ACTION_KEY, JSON.stringify(action));
}

function consumePostAuthReturnTo(): string | null {
  const returnTo = sessionStorage.getItem(RETURN_TO_KEY);
  sessionStorage.removeItem(RETURN_TO_KEY);
  return returnTo;
}

/**
 * Whatever came out of sessionStorage was JSON written by an older build as
 * easily as by this one, so it is narrowed rather than asserted.
 */
function isPostAuthAction(value: unknown): value is PostAuthAction {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "registerUser"
  );
}

function consumePostAuthAction(): PostAuthAction | null {
  const raw = sessionStorage.getItem(ACTION_KEY);
  sessionStorage.removeItem(ACTION_KEY);
  const parsed = safeJsonParse(raw);
  return isPostAuthAction(parsed) ? parsed : null;
}

interface SignInOptions {
  /** Force Google's account chooser instead of reusing the last session. */
  promptSelectAccount?: boolean;
}

// Popup-based sign-in for the signup pages' own "Sign up with Google" step:
// it only signs in, with none of signInWithGoogle()'s post-auth routing,
// because the page continues with its form. Being a popup, it never
// navigates away, so it sidesteps a real
// production failure mode of signInWithRedirect: the auth result silently
// failing to persist across the redirect round-trip (no thrown error, just
// getRedirectResult() coming back empty), which made Google sign-in on the
// signup pages look like it did nothing at all. It also means a signup
// page's already-filled form fields survive, since the page never reloads.
export async function signInForSignup({ promptSelectAccount = false }: SignInOptions = {}): Promise<User> {
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  if (promptSelectAccount) provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

interface SignInWithGoogleOptions extends SignInOptions {
  /** Path (with search/hash) to return to once auth completes. */
  returnTo?: string;
  action?: PostAuthAction;
  navigate: NavigateFunction;
}

// Error codes that mean the person closed or superseded the popup - not a
// failure worth reporting.
const POPUP_DISMISSED = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/user-cancelled",
]);

/**
 * Google sign-in for every "Log in" entry point: a popup, then the same
 * post-auth routing the redirect flow used (account check, role-based
 * landing page, the signup form's registerUser action).
 *
 * This used signInWithRedirect everywhere except localhost, and in
 * production it silently did nothing: the site is served from
 * learn.diyaresearch.org while VITE_FIREBASE_AUTH_DOMAIN is
 * curriculum-portal-1ce8f.firebaseapp.com, and browsers that partition
 * third-party storage (current Chrome, Safari, Firefox) lose the auth
 * result across that cross-site round trip. getRedirectResult() comes back
 * empty with no error, so "Log in" just reloaded the page signed out.
 * signInForSignup() above switched the signup pages to a popup for the same
 * reason; this does it for the rest.
 */
export async function signInWithGoogle({
  returnTo,
  promptSelectAccount = false,
  action,
  navigate,
}: SignInWithGoogleOptions): Promise<void> {
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  if (promptSelectAccount) provider.setCustomParameters({ prompt: "select_account" });

  let user: User;
  try {
    user = (await signInWithPopup(auth, provider)).user;
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    if (code && POPUP_DISMISSED.has(code)) return;
    if (code === "auth/popup-blocked") {
      throw new Error(
        "Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.",
        { cause: err }
      );
    }
    console.error("googleAuth: signInWithGoogle failed", err);
    throw err;
  }

  await completeGoogleSignIn({ user, returnTo: returnTo || "/", action: action || null, navigate });
}

export interface RedirectResult {
  result: UserCredential | null;
  error: unknown;
}

export async function consumeGoogleRedirectResult(): Promise<RedirectResult> {
  const auth = getAuth();
  try {
    const result = await getRedirectResult(auth);
    return { result, error: null };
  } catch (error) {
    // In non-browser environments (e.g. Vitest, SSR) redirect operations may be unsupported.
    if ((error as { code?: string } | null)?.code === "auth/operation-not-supported-in-this-environment") {
      return { result: null, error: null };
    }
    console.error("googleAuth: getRedirectResult failed", error);
    return { result: null, error };
  }
}

/**
 * A union rather than one shape with nullable fields: `if (!account.exists)`
 * is how every caller branches, and this makes that check the thing that
 * gives them a non-null `role` on the other side of it.
 */
export type ResolvedAccount =
  | { exists: true; role: string; collection: "users"; data: UserDocument }
  | { exists: false; role: null; collection: null; data: null; error?: unknown };

export async function resolveAccountByUid(uid: string): Promise<ResolvedAccount> {
  try {
    const userSnap = await getDoc(doc(db, COLLECTIONS.users, uid));
    if (userSnap.exists()) {
      const data = (userSnap.data() as UserDocument | undefined) || {};
      return { exists: true, role: data.role || ROLES.TEACHER_DEFAULT, collection: "users", data };
    }

    return { exists: false, role: null, collection: null, data: null };
  } catch (err) {
    console.error("googleAuth: resolveAccountByUid failed", err);
    return { exists: false, role: null, collection: null, data: null, error: err };
  }
}

function withQueryParam(pathWithSearch: string | null | undefined, key: string, value: string): string {
  try {
    const base = window.location.origin;
    const url = new URL(pathWithSearch || "/", base);
    url.searchParams.set(key, value);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch (err) {
    console.error("googleAuth: withQueryParam failed", err);
    const hasQ = (pathWithSearch || "/").includes("?");
    const sep = hasQ ? "&" : "?";
    return `${pathWithSearch || "/"}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }
}

interface RegisterActionResult {
  ok: boolean;
  status: number;
  error?: unknown;
}

async function runRegisterUserAction({
  user,
  payload,
}: {
  user: User;
  payload: NonNullable<PostAuthAction["payload"]>;
}): Promise<RegisterActionResult> {
  if (!import.meta.env.VITE_SERVER_ORIGIN_URL) {
    console.error("googleAuth: missing VITE_SERVER_ORIGIN_URL for register action");
    return { ok: false, status: 0 };
  }

  try {
    await api.post("/api/user/register", {
      ...payload,
      email: user.email,
      fullName: user.displayName,
    });
    return { ok: true, status: 200 };
  } catch (err) {
    // Callers here only branch on ok/status, so a non-2xx and a transport
    // failure collapse into the same shape they always got - ApiError just
    // carries a real status now instead of 0.
    console.error("googleAuth: register action failed", err);
    return { ok: false, status: err instanceof ApiError ? err.status : 0, error: err };
  }
}

/**
 * Finishes a redirect sign-in, if one is pending. Nothing starts a redirect
 * any more (see signInWithGoogle), but this stays so that anyone who was
 * mid-redirect when the popup flow shipped still lands correctly, and so an
 * empty result stays a cheap no-op on every page load.
 */
export async function handleGoogleRedirectOnce(navigate: NavigateFunction): Promise<void> {
  const { result } = await consumeGoogleRedirectResult();
  const user = result?.user;
  if (!user) return;

  await completeGoogleSignIn({
    user,
    returnTo: consumePostAuthReturnTo() || "/",
    action: consumePostAuthAction(),
    navigate,
  });
}

/**
 * Where a freshly signed-in Google user goes: run the signup form's register
 * action if there is one, sign out anyone with no account (unless they are
 * on a signup page, mid-signup), and send admins and TeacherPlus users to
 * their landing pages.
 */
async function completeGoogleSignIn({
  user,
  returnTo,
  action,
  navigate,
}: {
  user: User;
  returnTo: string;
  action: PostAuthAction | null;
  navigate: NavigateFunction;
}): Promise<void> {
  if (action?.type === "registerUser") {
    const reg = await runRegisterUserAction({ user, payload: action.payload || {} });
    if (!reg.ok) {
      navigate(withQueryParam(returnTo, "showSignUpPopup", "1"), { replace: true });
      return;
    }
    navigate(returnTo, { replace: true });
    return;
  }

  const account = await resolveAccountByUid(user.uid);
  if (!account.exists) {
    // Landing on the signup pages themselves with no existing account is the
    // expected state for someone mid-signup, not an invalid login attempt.
    // Signing them out here (as we do everywhere else) meant Google auth
    // always looked like it silently failed and no profile was ever created.
    const isSignupPage = returnTo.startsWith("/teacher-signup") || returnTo.startsWith("/student-signup");
    if (isSignupPage) {
      navigate(returnTo, { replace: true });
      return;
    }
    await signOut(getAuth());
    navigate(withQueryParam(returnTo, "showSignUpPopup", "1"), { replace: true });
    return;
  }

  if (account.role === ROLES.TEACHER_PLUS) {
    navigate("/teacher-plus", { replace: true });
    return;
  }
  if (account.role === ROLES.ADMIN) {
    navigate("/", { replace: true });
    return;
  }

  navigate(returnTo, { replace: true });
}
