/**
 * One way to call the backend.
 *
 * Before this, ~43 call sites each did their own version of: build a URL from
 * VITE_SERVER_ORIGIN_URL, grab a Firebase ID token, set an Authorization
 * header, check response.ok (or not), parse JSON (or not), and report the
 * failure (console.error, alert, or silence). This centralizes all of it.
 *
 * Deliberately NOT included: unwrapping a response envelope. The backend has
 * `responseHelpers.js` ({ success, data } / { success:false, error }), but
 * only routes/user.js actually uses it - the other 53 responses are raw
 * res.json(). So this returns the parsed body verbatim and lets callers keep
 * reading the shape their endpoint actually sends. Unwrapping here would
 * silently break every non-user route. (Making the backend consistent is a
 * separate job; see the note in the #370 PR.)
 *
 * Payment routes are on the same origin as everything else since #439, but
 * still go through utils/paymentsApi.js - its call sites work with the raw
 * Response rather than this module's throw-on-error contract. See CLAUDE.md.
 */

import { getAuth } from "firebase/auth";

import { API_ORIGIN } from "@/utils/apiOrigin";

/**
 * A failed API call. Carries enough for a caller to branch on the cause
 * rather than string-matching a message.
 *
 *   status  HTTP status, or 0 if the request never got a response
 *   code    server's error.code when it sends the envelope, else a synthetic
 *           one: NETWORK_ERROR / HTTP_ERROR / ABORTED
 */
export class ApiError extends Error {
  constructor(message, { status = 0, code = "HTTP_ERROR", details = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True for the cases where asking the user to sign in again is the fix. */
  get isAuthError() {
    return this.status === 401 || this.status === 403;
  }
}

/** Pull the most useful message out of whatever the server sent back. */
async function errorFromResponse(response) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON error body (an HTML error page, or empty). Fall through.
  }

  const enveloped = body && typeof body === "object" ? body.error : null;
  return new ApiError(
    enveloped?.message || body?.message || `Request failed (${response.status})`,
    {
      status: response.status,
      code: enveloped?.code || "HTTP_ERROR",
      details: enveloped?.details ?? null,
    }
  );
}

async function authHeader() {
  const user = getAuth().currentUser;
  if (!user) return {};
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}

/**
 * Call `path` on the backend.
 *
 * @param {string} path     e.g. "/api/user/me" (leading slash optional)
 * @param {object} options
 *   method   HTTP verb, default GET
 *   body     plain object, JSON-encoded automatically; pass FormData to send
 *            a multipart upload (Content-Type is then left to the browser)
 *   auth     attach the caller's Firebase ID token. Default true - most of
 *            this API is authenticated, so opting OUT is the exception worth
 *            spelling out at the call site.
 *   signal   AbortSignal, so a caller (or useApi) can cancel in flight
 * @returns   parsed JSON body, or null for 204/empty
 * @throws    {ApiError}
 */
export async function apiRequest(path, options = {}) {
  const { method = "GET", body, auth = true, signal, headers = {} } = options;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const requestHeaders = {
    ...(auth ? await authHeader() : {}),
    ...(body != null && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...headers,
  };

  let response;
  try {
    response = await fetch(`${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`, {
      method,
      headers: requestHeaders,
      signal,
      ...(body != null ? { body: isFormData ? body : JSON.stringify(body) } : {}),
    });
  } catch (cause) {
    // fetch() rejects only on network failure or abort - never on 4xx/5xx.
    if (cause?.name === "AbortError") {
      throw new ApiError("Request cancelled", { code: "ABORTED" });
    }
    throw new ApiError("Could not reach the server. Check your connection and try again.", {
      code: "NETWORK_ERROR",
      details: cause?.message ?? null,
    });
  }

  if (!response.ok) throw await errorFromResponse(response);

  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: "GET" }),
  post: (path, body, options) => apiRequest(path, { ...options, method: "POST", body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: "PATCH", body }),
  del: (path, options) => apiRequest(path, { ...options, method: "DELETE" }),
};
