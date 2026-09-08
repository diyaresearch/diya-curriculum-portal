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

/** Synthetic codes this module raises when the server did not supply one. */
export type ApiErrorCode = "NETWORK_ERROR" | "HTTP_ERROR" | "ABORTED" | (string & {});

export interface ApiErrorInit {
  status?: number;
  code?: ApiErrorCode;
  details?: unknown;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Plain object (JSON-encoded) or FormData (left to the browser). */
  body?: unknown;
  /** Attach the caller's Firebase ID token. Default true. */
  auth?: boolean;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/** The response envelope the backend's responseHelpers.js sends, when it does. */
interface ErrorEnvelope {
  message?: string;
  code?: string;
  details?: unknown;
}

/**
 * A failed API call. Carries enough for a caller to branch on the cause
 * rather than string-matching a message.
 *
 *   status  HTTP status, or 0 if the request never got a response
 *   code    server's error.code when it sends the envelope, else a synthetic
 *           one: NETWORK_ERROR / HTTP_ERROR / ABORTED
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details: unknown;

  constructor(message: string, { status = 0, code = "HTTP_ERROR", details = null }: ApiErrorInit = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True for the cases where asking the user to sign in again is the fix. */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

/** Pull the most useful message out of whatever the server sent back. */
async function errorFromResponse(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON error body (an HTML error page, or empty). Fall through.
  }

  // `body` is genuinely unknown - it is whatever the route chose to send -
  // so it is narrowed rather than asserted.
  const asRecord = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const enveloped = (asRecord?.error ?? null) as ErrorEnvelope | null;
  const bodyMessage = typeof asRecord?.message === "string" ? asRecord.message : undefined;

  return new ApiError(enveloped?.message || bodyMessage || `Request failed (${response.status})`, {
    status: response.status,
    code: enveloped?.code || "HTTP_ERROR",
    details: enveloped?.details ?? null,
  });
}

async function authHeader(): Promise<Record<string, string>> {
  const user = getAuth().currentUser;
  if (!user) return {};
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}

/**
 * Call `path` on the backend.
 *
 * The result type is a caller-supplied generic defaulting to `unknown`,
 * because this client deliberately does not unwrap a response envelope - the
 * body is whatever the route sent. Pass the shape you expect
 * (`api.get<Lesson>(...)`) and `unknown` will make you handle it otherwise.
 *
 * @param path     e.g. "/api/user/me" (leading slash optional)
 * @returns        parsed JSON body, or null for 204/empty
 * @throws         {ApiError}
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T | null> {
  const { method = "GET", body, auth = true, signal, headers = {} } = options;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const requestHeaders = {
    ...(auth ? await authHeader() : {}),
    ...(body != null && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...headers,
  };

  let response: Response;
  try {
    response = await fetch(`${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`, {
      method,
      headers: requestHeaders,
      signal,
      ...(body != null ? { body: isFormData ? (body as FormData) : JSON.stringify(body) } : {}),
    });
  } catch (cause) {
    // fetch() rejects only on network failure or abort - never on 4xx/5xx.
    const error = cause as { name?: string; message?: string } | null;
    if (error?.name === "AbortError") {
      throw new ApiError("Request cancelled", { code: "ABORTED" });
    }
    throw new ApiError("Could not reach the server. Check your connection and try again.", {
      code: "NETWORK_ERROR",
      details: error?.message ?? null,
    });
  }

  if (!response.ok) throw await errorFromResponse(response);

  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    // A 2xx that is not JSON: hand back the raw text, as this has always done.
    return text as T;
  }
}

type BodylessCall = <T = unknown>(
  path: string,
  options?: RequestOptions
) => Promise<T | null>;
type BodiedCall = <T = unknown>(
  path: string,
  body?: unknown,
  options?: RequestOptions
) => Promise<T | null>;

export const api: {
  get: BodylessCall;
  post: BodiedCall;
  put: BodiedCall;
  patch: BodiedCall;
  del: BodylessCall;
} = {
  get: (path, options) => apiRequest(path, { ...options, method: "GET" }),
  post: (path, body, options) => apiRequest(path, { ...options, method: "POST", body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: "PATCH", body }),
  del: (path, options) => apiRequest(path, { ...options, method: "DELETE" }),
};
