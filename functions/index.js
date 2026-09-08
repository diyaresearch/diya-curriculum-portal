/**
 * Cloud Functions entry point.
 *
 * The app itself is built in app.js; this file only wraps it for the Firebase
 * runtime. See local.js for the plain-Node entry used in dev and CI.
 *
 * The export is still named `payments`, which is now a historical name rather
 * than a description: since #439 this one function serves the whole API, not
 * just payment processing. It keeps the name because the deployed function URL
 * is baked into the Firebase Hosting rewrite (firebase.json), the Stripe
 * webhook endpoint registered in the Stripe dashboard, and any bookmarked
 * client. Renaming it is a coordinated change across all three, not a code
 * change — worth doing, but not worth doing silently inside a refactor.
 */

const { onRequest } = require("firebase-functions/v2/https");
const { buildApp } = require("./app");

exports.payments = onRequest(
  {
    region: "us-central1",
    invoker: "public",
    // Bind Firebase Secret Manager secrets so they are available at runtime as
    // process.env.*. utils/stripeClient.js resolves which of these to use per
    // call rather than at require time, because the runtime populates them
    // after module load.
    secrets: [
      "STRIPE_SECRET_KEY",
      "STRIPE_SECRET_KEY_TEST",
      "STRIPE_SECRET_KEY_LIVE",
      "STRIPE_WEBHOOK_SECRET",
      // Optional mode-specific webhook secrets if you choose to set them:
      "STRIPE_WEBHOOK_SECRET_TEST",
      "STRIPE_WEBHOOK_SECRET_LIVE",
      "STRIPE_PUBLISHABLE_KEY",
      // Optional mode-specific publishable keys if you choose to set them:
      "STRIPE_PUBLISHABLE_KEY_TEST",
      "STRIPE_PUBLISHABLE_KEY_LIVE",
    ],
  },
  buildApp()
);
