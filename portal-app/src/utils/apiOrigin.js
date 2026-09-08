/**
 * Where the API lives. One value, one place (#439).
 *
 * There used to be two backends and two different ways of finding them:
 * apiClient.js read VITE_SERVER_ORIGIN_URL (App Engine), while paymentsApi.js
 * ignored it and picked between a hardcoded Cloud Function URL and a
 * same-origin path by sniffing window.location.hostname. A call's origin
 * therefore depended on which module you happened to import.
 *
 * There is one backend now, so there is one origin.
 *
 *   VITE_SERVER_ORIGIN_URL set  -> call it absolutely. This is the normal
 *                                  case: the function's own URL in
 *                                  production, http://localhost:3001 in dev
 *                                  (where Vite also proxies /api there).
 *   unset                       -> "" , meaning same-origin. Firebase Hosting
 *                                  rewrites /api/** to the function
 *                                  (firebase.json), so a page served from
 *                                  Hosting can reach the API with no origin
 *                                  configured at all.
 *
 * Paths are always written from the root ("/api/units"), never relative to
 * this value, so both forms compose the same way.
 */

export const API_ORIGIN = String(import.meta.env.VITE_SERVER_ORIGIN_URL || "")
  .trim()
  .replace(/\/+$/, "");

/** Absolute URL for an API path, e.g. apiUrl("/api/units"). */
export function apiUrl(path) {
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}
