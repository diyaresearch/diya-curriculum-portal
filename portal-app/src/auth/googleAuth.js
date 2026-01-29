import { getAuth, GoogleAuthProvider, getRedirectResult, signInWithRedirect, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { signInWithPopup } from "firebase/auth";
 
const RETURN_TO_KEY = "diya_auth:returnTo";
const ACTION_KEY = "diya_auth:action";
 
function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch (err) {
    console.error("googleAuth: failed to parse JSON from storage", err);
    return null;
  }
}
 
export function setPostAuthReturnTo(returnTo) {
  if (typeof returnTo === "string" && returnTo.trim()) {
    sessionStorage.setItem(RETURN_TO_KEY, returnTo);
  }
}
 
export function setPostAuthAction(action) {
  if (!action) return;
  sessionStorage.setItem(ACTION_KEY, JSON.stringify(action));
}
 
function consumePostAuthReturnTo() {
  const returnTo = sessionStorage.getItem(RETURN_TO_KEY);
  sessionStorage.removeItem(RETURN_TO_KEY);
  return returnTo;
}
 
function consumePostAuthAction() {
  const raw = sessionStorage.getItem(ACTION_KEY);
  sessionStorage.removeItem(ACTION_KEY);
  return safeJsonParse(raw);
}
 
export async function startGoogleRedirect({
  returnTo,
  promptSelectAccount = false,
  action,
} = {}) {
  try {
    if (returnTo) setPostAuthReturnTo(returnTo);
    if (action) setPostAuthAction(action);
 
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    if (promptSelectAccount) provider.setCustomParameters({ prompt: "select_account" });
 
    if (window.location.hostname === "localhost") {
      await signInWithPopup(auth, provider);
    } else {
      await signInWithRedirect(auth, provider);
    }
  } catch (err) {
    console.error("googleAuth: startGoogleRedirect failed", err);
    throw err;
  }
}
 
export async function consumeGoogleRedirectResult() {
  const auth = getAuth();
  try {
    const result = await getRedirectResult(auth);
    return { result, error: null };
  } catch (error) {
    // In non-browser environments (e.g. Jest, SSR) redirect operations may be unsupported.
    if (error?.code === "auth/operation-not-supported-in-this-environment") {
      return { result: null, error: null };
    }
    console.error("googleAuth: getRedirectResult failed", error);
    return { result: null, error };
  }
}
 
export async function resolveAccountByUid(uid) {
  try {
    const teacherSnap = await getDoc(doc(db, "teachers", uid));
    if (teacherSnap.exists()) {
      const data = teacherSnap.data() || {};
      return { exists: true, role: data.role || "teacherDefault", collection: "teachers", data };
    }
 
    const studentSnap = await getDoc(doc(db, "students", uid));
    if (studentSnap.exists()) {
      const data = studentSnap.data() || {};
      return { exists: true, role: data.role || "student", collection: "students", data };
    }
 
    return { exists: false, role: null, collection: null, data: null };
  } catch (err) {
    console.error("googleAuth: resolveAccountByUid failed", err);
    return { exists: false, role: null, collection: null, data: null, error: err };
  }
}
 
function withQueryParam(pathWithSearch, key, value) {
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
 
async function runRegisterUserAction({ user, payload }) {
  const baseUrl = process.env.REACT_APP_SERVER_ORIGIN_URL || "";
  if (!baseUrl) {
    console.error("googleAuth: missing REACT_APP_SERVER_ORIGIN_URL for register action");
    return { ok: false, status: 0 };
  }
 
  try {
    const token = await user.getIdToken();
    const response = await fetch(`${baseUrl}/api/user/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...payload,
        email: user.email,
        fullName: user.displayName,
      }),
    });
    return { ok: response.ok, status: response.status };
  } catch (err) {
    console.error("googleAuth: register action failed", err);
    return { ok: false, status: 0, error: err };
  }
}
 
export async function handleGoogleRedirectOnce(navigate) {
  const { result } = await consumeGoogleRedirectResult();
  const user = result?.user;
  if (!user) return;
 
  const returnTo = consumePostAuthReturnTo() || "/";
  const action = consumePostAuthAction();
 
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
    await signOut(getAuth());
    navigate(withQueryParam(returnTo, "showSignUpPopup", "1"), { replace: true });
    return;
  }
 
  if (account.role === "teacherPlus") {
    navigate("/teacher-plus", { replace: true });
    return;
  }
  if (account.role === "admin") {
    navigate("/", { replace: true });
    return;
  }
 
  navigate(returnTo, { replace: true });
}
