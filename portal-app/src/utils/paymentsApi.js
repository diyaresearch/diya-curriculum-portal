/**
 * Where /api/payment/* calls go, and how they get there.
 *
 * Payment routes used to be split across two live backends by convention,
 * not architecture: module_detail's checkout call hit Firebase Functions
 * directly, PaymentPage/YearlyPaymentPage called REACT_APP_SERVER_ORIGIN_URL
 * (App Engine - a different backend entirely), and module_builder's checkout
 * call was a bare relative fetch with no fallback at all. Each copy of the
 * origin-selection logic had drifted independently. Payments are now
 * consolidated onto functions/ (issue #439) - it owns the working, idempotent
 * Stripe webhook and the entitlement-granting logic that goes with it.
 *
 * Firebase Hosting rewrites /api/** to that same function (firebase.json),
 * so a same-origin relative path also works when the page is actually served
 * through a Hosting rewrite. Everywhere else - localhost (CRA's dev proxy
 * only forwards to the App Engine dev server, not Functions), an explicit
 * override, or any domain Hosting rewrites don't cover - this calls the
 * Cloud Function directly instead, so payments work regardless of how or
 * where the frontend itself ends up served.
 */

const DEFAULT_FUNCTIONS_BASE = "https://us-central1-curriculum-portal-1ce8f.cloudfunctions.net/payments";

function isLocalhost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function isFirebaseHostingDomain(hostname) {
  return /\.web\.app$|\.firebaseapp\.com$/i.test(hostname || "");
}

/**
 * Base URL to call the payments API on, or "" to mean same-origin (relying
 * on the Firebase Hosting rewrite).
 */
export function paymentsOrigin() {
  const override = String(process.env.REACT_APP_PAYMENTS_FUNCTIONS_BASE_URL || "").trim();
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const shouldUseFunctionsDirect =
    isLocalhost(hostname) || Boolean(override) || !isFirebaseHostingDomain(hostname);
  return shouldUseFunctionsDirect ? (override || DEFAULT_FUNCTIONS_BASE) : "";
}

/**
 * Fetch a /api/payment/<path> route. If the resolved origin is same-origin
 * and the host turns out not to actually support the Hosting rewrite (a
 * 404/405 back from what should have been the payments route), retries once
 * against the Cloud Function directly rather than failing outright.
 */
export async function fetchPayments(path, options) {
  const origin = paymentsOrigin();
  const suffix = `/api/payment${path}`;
  const endpoint = origin ? `${origin}${suffix}` : suffix;

  const response = await fetch(endpoint, options);

  if (!origin && (response.status === 404 || response.status === 405)) {
    return fetch(`${DEFAULT_FUNCTIONS_BASE}${suffix}`, options);
  }

  return response;
}
