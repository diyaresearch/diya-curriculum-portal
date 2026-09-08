/**
 * Where /api/payment/* calls go.
 *
 * This module used to carry real logic, because payments lived on a different
 * backend from everything else: it hardcoded the Cloud Function URL, chose
 * between that and a same-origin path by sniffing window.location.hostname,
 * and retried against the function directly when a same-origin call came back
 * 404/405 (the sign that Firebase Hosting had not rewritten it after all).
 *
 * #439 collapsed the two backends into one, so all of that is gone. Payment
 * routes are on the same origin as every other route now — see utils/apiOrigin
 * — and this is a thin wrapper that adds the /api/payment prefix.
 *
 * It stays separate from apiClient.js only because its four call sites work
 * with the Response object directly (checking res.ok, reading Stripe's
 * client_secret out of the body) rather than apiClient's throw-on-error
 * contract. Converting them is a change to live payment flows, not a
 * consolidation, so it is deliberately not bundled in here.
 */

import { apiUrl } from "@/utils/apiOrigin";

/** Fetch a /api/payment/<path> route. `path` starts with a slash. */
export function fetchPayments(path, options) {
  return fetch(apiUrl(`/api/payment${path}`), options);
}
