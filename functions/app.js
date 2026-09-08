/**
 * The API. One Express app, one backend (#439).
 *
 * There used to be two: an App Engine service in server/ owning users, roles,
 * content, lessons, modules and subscriptions, and this Cloud Function owning
 * payments. They shared ~1,330 lines across nine modules by copy-paste, and
 * the copies had silently drifted — functions/ never got #428's emulator
 * support or #434's pagination fix, and each side had its own Stripe
 * initializer that disagreed with the other about test-vs-live keys.
 *
 * Neither deploy target can require code from a sibling directory (App Engine
 * uploads server/, Firebase uploads functions/), so there was no shared
 * package to extract into that would survive both deploys. Collapsing to one
 * backend removes the problem rather than managing it.
 *
 * This module builds the app and nothing else. Two entry points wrap it:
 *   index.js  the Cloud Function (`payments`), which is how it runs deployed
 *   local.js  a plain app.listen(), which is how it runs in dev and in CI
 */

const express = require("express");
const cors = require("cors");

// Must run before anything that reads RATE_LIMIT_* at require time — which
// middleware/rateLimiter.js does, via the routes required below. This is the
// same ordering server/index.js had; getting it wrong silently swaps the
// configured limits for express-rate-limit's own defaults.
const { setDefaults } = require("./utils/envValidator");
setDefaults();

const unitsRoutes = require("./routes/units");
const lessonsRoutes = require("./routes/lessons");
const modulesRoutes = require("./routes/modules");
const userRoutes = require("./routes/user");
const subscriptionRoutes = require("./routes/subscription");
const paymentRoutes = require("./routes/payment");
const { stripeWebhookHandler } = require("./routes/stripeWebhook");
const { generalLimiter } = require("./middleware/rateLimiter");
const { globalErrorHandler, notFoundHandler } = require("./middleware/errorHandler");

function buildApp() {
  const env = process.env.NODE_ENV || "development";
  const app = express();

  // Both runtimes sit exactly one proxy hop behind Google's front end, which
  // sets X-Forwarded-For to the real client IP. Without this, req.ip is that
  // proxy and express-rate-limit (#383) buckets the entire userbase together.
  app.set("trust proxy", 1);

  // The webhook is registered FIRST, with a raw body parser, because Stripe
  // signature verification needs the exact bytes sent. Anything that parses
  // the body ahead of it breaks verification for every event.
  //
  // Two paths, because the function is reachable two ways: directly at
  // <function-url>/webhook, and through the Firebase Hosting rewrite at
  // /api/payment/webhook. Both are registered in Stripe historically, so both
  // keep working.
  app.post("/webhook", express.raw({ type: "*/*" }), stripeWebhookHandler);
  app.post("/api/payment/webhook", express.raw({ type: "*/*" }), stripeWebhookHandler);

  // Everything after this point gets a parsed JSON body.
  app.use(express.json());

  // Origins from SERVER_ALLOW_ORIGIN (comma-separated) are additive to the
  // hardcoded defaults rather than replacing them, in both modes - a deploy
  // whose SERVER_ALLOW_ORIGIN doesn't happen to list every origin already
  // relied on can't silently start rejecting production traffic (#393).
  const envOrigins = process.env.SERVER_ALLOW_ORIGIN
    ? process.env.SERVER_ALLOW_ORIGIN.split(",").map((url) => url.trim()).filter(Boolean)
    : [];

  const ALLOWED_ORIGINS = new Set([
    "https://diyaresearch.org",
    "https://www.diyaresearch.org",
    "https://curriculum-portal-1ce8f.web.app",
    "https://curriculum-portal-1ce8f.firebaseapp.com",
    // Production custom domain (issue #421 follow-up)
    "https://learn.diyaresearch.org",
    ...envOrigins,
  ]);

  if (env === "production") {
    app.use(
      cors({
        origin: (origin, callback) => {
          // Server-to-server and same-origin requests send no Origin header.
          if (!origin) return callback(null, true);
          if (ALLOWED_ORIGINS.has(origin)) return callback(null, true);
          return callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      })
    );

    // Ensure preflight always succeeds. Express 5's router (path-to-regexp
    // v8) requires wildcard segments to be named - a bare "*" throws
    // `PathError: Missing parameter name` at route-registration time,
    // synchronously, before the app ever serves a request. That's a hard
    // crash on every boot in production mode specifically, which is why CI
    // boots this app with NODE_ENV=production rather than trusting unit
    // tests that only ever exercise modules in isolation.
    app.options("/*splat", cors());
  } else {
    // Development: localhost only. The hardcoded ports are fallback defaults
    // matching the frontend (3000) and this app's own local port (3001); real
    // configurability comes from SERVER_ALLOW_ORIGIN.
    const devAllowedOrigins = new Set([
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
      ...envOrigins,
    ]);

    app.use(
      cors({
        origin: (origin, callback) => {
          // Requests without an Origin (Postman, curl) are allowed in dev only.
          if (!origin || devAllowedOrigins.has(origin)) return callback(null, true);
          return callback(new Error("Not allowed by CORS - development mode"));
        },
        methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization", "Origin", "X-Requested-With", "Accept"],
        credentials: true,
      })
    );
  }

  app.use("/api", generalLimiter);

  app.use("/api", unitsRoutes);
  app.use("/api", lessonsRoutes);
  app.use("/api", modulesRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/subscription", subscriptionRoutes);
  app.use("/api/payment", paymentRoutes);

  // Liveness + Firestore reachability. Returns 503 when the Admin credential
  // is dead, so an outage like issue #418 is visible to a health check
  // instead of only surfacing as 500s on every data route.
  app.get("/api/health", async (req, res) => {
    const { db } = require("./config/firebaseConfig");
    const { verifyCredential } = require("./config/credentials");

    const result = await verifyCredential(db);
    if (result.ok) {
      return res.json({ status: "ok", firestore: "reachable" });
    }

    return res.status(503).json({
      status: "degraded",
      firestore: "unreachable",
      error: result.error.message,
    });
  });

  app.get("/", (req, res) => {
    res.send("Welcome to the Curriculum Portal API");
  });

  // The payment routes are also reachable without the /api/payment prefix, at
  // the bare function URL (<function-url>/create-module-checkout-session).
  // The frontend no longer calls them that way - utils/paymentsApi.js always
  // sends /api/payment/* - but this mount predates that and costs nothing to
  // keep for a caller the audit missed. Mounted last so it can never shadow a
  // real /api route.
  app.use("/", paymentRoutes);

  // 404 handler for unmatched routes (must be before the global error handler)
  app.use(notFoundHandler);

  // Global error handler (must be LAST middleware)
  app.use(globalErrorHandler);

  return app;
}

module.exports = { buildApp };
