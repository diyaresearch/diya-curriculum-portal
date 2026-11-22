/**
 * "Log in" signs in through a popup and then routes the user (production
 * login fix).
 *
 * Every Log in button used signInWithRedirect, which in production returned
 * to the page signed out with no error: the site's domain and the Firebase
 * auth domain differ, and browsers that partition third-party storage lose
 * the result across that round trip. These pin the popup flow and the
 * post-auth routing it shares with the old redirect handler.
 */

import { vi } from "vitest";
import { signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import { getDoc } from "firebase/firestore";
import { api } from "@/utils/apiClient";
import { signInWithGoogle } from "@/auth/googleAuth";

vi.mock("firebase/auth", () => {
  class GoogleAuthProvider {
    setCustomParameters() {}
  }
  return {
    getAuth: () => ({}),
    GoogleAuthProvider,
    signInWithPopup: vi.fn(),
    signInWithRedirect: vi.fn(),
    getRedirectResult: vi.fn(async () => null),
    signOut: vi.fn(async () => undefined),
  };
});

vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
}));

vi.mock("@/firebase/firebaseConfig", () => ({ app: {}, db: {} }));

vi.mock("@/utils/apiClient", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: { ...actual.api, post: vi.fn(async () => ({})) } };
});

const USER = { uid: "uid-1", email: "someone@example.com", displayName: "Some One" };

function account(role) {
  getDoc.mockResolvedValue(
    role === null
      ? { exists: () => false }
      : { exists: () => true, data: () => ({ role }) }
  );
}

function popupError(code) {
  signInWithPopup.mockRejectedValue(Object.assign(new Error(code), { code }));
}

beforeEach(() => {
  vi.clearAllMocks();
  signInWithPopup.mockResolvedValue({ user: USER });
});

test("uses a popup, never a redirect", async () => {
  account("teacherDefault");
  await signInWithGoogle({ navigate: vi.fn(), returnTo: "/" });
  expect(signInWithPopup).toHaveBeenCalledTimes(1);
  expect(signInWithRedirect).not.toHaveBeenCalled();
});

test("an admin lands on the home page", async () => {
  account("admin");
  const navigate = vi.fn();
  await signInWithGoogle({ navigate, returnTo: "/upgrade" });
  expect(navigate).toHaveBeenCalledWith("/", { replace: true });
  expect(signOut).not.toHaveBeenCalled();
});

test("a TeacherPlus user lands on /teacher-plus", async () => {
  account("teacherPlus");
  const navigate = vi.fn();
  await signInWithGoogle({ navigate, returnTo: "/" });
  expect(navigate).toHaveBeenCalledWith("/teacher-plus", { replace: true });
});

test("any other account goes back where it started", async () => {
  account("teacherDefault");
  const navigate = vi.fn();
  await signInWithGoogle({ navigate, returnTo: "/module/abc" });
  expect(navigate).toHaveBeenCalledWith("/module/abc", { replace: true });
});

test("a Google account with no portal account is signed out and offered signup", async () => {
  account(null);
  const navigate = vi.fn();
  await signInWithGoogle({ navigate, returnTo: "/" });
  expect(signOut).toHaveBeenCalled();
  expect(navigate).toHaveBeenCalledWith("/?showSignUpPopup=1", { replace: true });
});

test("the navbar signup form's register action runs after sign-in", async () => {
  // The register step is a no-op without a configured API origin.
  vi.stubEnv("VITE_SERVER_ORIGIN_URL", "https://api.example.test");
  const navigate = vi.fn();
  await signInWithGoogle({
    navigate,
    returnTo: "/",
    action: { type: "registerUser", payload: { firstName: "Some" } },
  });
  expect(api.post).toHaveBeenCalledWith(
    "/api/user/register",
    expect.objectContaining({ firstName: "Some", email: USER.email })
  );
  expect(navigate).toHaveBeenCalledWith("/", { replace: true });
  vi.unstubAllEnvs();
});

test("closing the popup is not an error and goes nowhere", async () => {
  popupError("auth/popup-closed-by-user");
  const navigate = vi.fn();
  await expect(signInWithGoogle({ navigate, returnTo: "/" })).resolves.toBeUndefined();
  expect(navigate).not.toHaveBeenCalled();
});

test("a blocked popup explains how to fix it", async () => {
  popupError("auth/popup-blocked");
  await expect(signInWithGoogle({ navigate: vi.fn(), returnTo: "/" })).rejects.toThrow(
    /Allow pop-ups for this site/
  );
});
