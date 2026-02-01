const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const paymentRouter = require("./routes/payment");

const app = express();

// CORS + preflight handling (required for browser calls from localhost/web app)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowList = new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://curriculum-portal-1ce8f.web.app",
    "https://curriculum-portal-1ce8f.firebaseapp.com",
  ]);

  if (origin && allowList.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }
  next();
});

function getDb() {
  const admin = require("firebase-admin");
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
  return admin.firestore();
}

function resolveSchemaQualifier() {
  const explicit = String(process.env.DATABASE_SCHEMA_QUALIFIER || "").trim();
  if (explicit) return explicit;
  // In Stripe, `event.livemode` is the most reliable signal for test vs prod payments.
  // We default based on the secret key as a fallback.
  const key = String(process.env.STRIPE_SECRET_KEY || "");
  if (key.startsWith("sk_live_")) return "prod.";
  return "";
}

function getStripe() {
  // Prefer mode-specific secrets. Default to TEST unless explicitly forced to LIVE.
  const rawForceLive = String(process.env.STRIPE_LIVEMODE || "").trim().toLowerCase();
  const forceLive = rawForceLive === "true" || rawForceLive === "1" || rawForceLive === "yes";

  const key =
    (forceLive
      ? process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY
      : process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY) ||
    // fallback
    process.env.STRIPE_SECRET_KEY_LIVE ||
    process.env.STRIPE_SECRET_KEY_TEST ||
    "";

  if (!key) return null;
  return require("stripe")(key);
}

function getWebhookSecretCandidates() {
  // Prefer mode-specific webhook secrets (Secret Manager). Fall back to legacy STRIPE_WEBHOOK_SECRET.
  const candidates = [
    process.env.STRIPE_WEBHOOK_SECRET_TEST,
    process.env.STRIPE_WEBHOOK_SECRET_LIVE,
    process.env.STRIPE_WEBHOOK_SECRET,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);

  // de-dupe
  return Array.from(new Set(candidates));
}

async function stripeWebhookHandler(req, res) {
  console.log("STRIPE WEBHOOK HIT", { path: req.path });

  const stripe = getStripe();
  if (!stripe) return res.status(500).send("Missing STRIPE_SECRET_KEY");
  const webhookSecrets = getWebhookSecretCandidates();
  if (webhookSecrets.length === 0) {
    return res
      .status(500)
      .send("Missing STRIPE_WEBHOOK_SECRET_TEST/STRIPE_WEBHOOK_SECRET_LIVE (or STRIPE_WEBHOOK_SECRET)");
  }

  const sig = req.headers["stripe-signature"];
  try {
    // Firebase provides the raw bytes as req.rawBody; express.raw() should also provide a Buffer body.
    const payload = req.rawBody || req.body;
    let event = null;
    let lastErr = null;

    for (const secret of webhookSecrets) {
      try {
        event = stripe.webhooks.constructEvent(payload, sig, secret);
        break;
      } catch (e) {
        lastErr = e;
      }
    }

    if (!event) {
      throw lastErr || new Error("Webhook signature verification failed");
    }

    console.log("✅ Stripe event type:", event.type);

    // Persist module purchase events to Firestore for audit/debugging.
    // - checkout.session.completed (best for Checkout)
    // - payment_intent.succeeded (fallback)
    if (event.type === "checkout.session.completed") {
      try {
        const session = event.data.object || {};
        const db = getDb();
        // For webhooks, Stripe's `event.livemode` is authoritative.
        const SCHEMA_QUALIFIER = event.livemode === true ? "prod." : "";
        const TABLE_PAYMENT_LOGS = SCHEMA_QUALIFIER + "payment_logs";

        const userId = session?.metadata?.userId || null;
        const moduleId = session?.metadata?.moduleId || null;
        const purchaseType = session?.metadata?.purchaseType || null;
        const amountTotalCents = typeof session.amount_total === "number" ? session.amount_total : null;
        const amountTotal =
          typeof amountTotalCents === "number" && Number.isFinite(amountTotalCents)
            ? amountTotalCents / 100
            : null;

        console.log("Writing checkout.session.completed log to:", TABLE_PAYMENT_LOGS, {
          livemode: event.livemode,
          checkoutSessionId: session.id,
          purchaseType,
          userId,
          moduleId,
        });

        // One row per purchase: update the existing doc created at session-creation time.
        // Doc id == checkoutSessionId.
        const ref = db.collection(TABLE_PAYMENT_LOGS).doc(String(session.id || "").trim());
        await ref.set(
          {
            status: "completed",
            paymentIntentId: session.payment_intent || null,
            purchaseType,
            userId,
            moduleId,
            // Stripe amounts are in the smallest currency unit (USD cents).
            amountTotal,
            amountTotalCents,
            currency: session.currency || null,
            completedAt: require("firebase-admin").firestore.FieldValue.serverTimestamp(),
            lastEventType: "checkout.session.completed",
          },
          { merge: true }
        );

        console.log("Updated payment log doc:", { collection: TABLE_PAYMENT_LOGS, id: session.id });
      } catch (e) {
        console.error("Failed to write payment_logs from checkout.session.completed:", e);
      }
    }

    if (event.type === "payment_intent.succeeded") {
      try {
        const pi = event.data.object || {};
        const db = getDb();
        // For webhooks, Stripe's `event.livemode` is authoritative.
        const SCHEMA_QUALIFIER = event.livemode === true ? "prod." : "";
        const TABLE_PAYMENT_LOGS = SCHEMA_QUALIFIER + "payment_logs";

        const userId = pi?.metadata?.userId || null;
        const moduleId = pi?.metadata?.moduleId || null;
        const purchaseType = pi?.metadata?.purchaseType || null;
        const checkoutSessionId = pi?.metadata?.checkoutSessionId || null;
        const amountCents = typeof pi.amount === "number" ? pi.amount : null;
        const amount =
          typeof amountCents === "number" && Number.isFinite(amountCents) ? amountCents / 100 : null;

        console.log("Writing payment_intent log to:", TABLE_PAYMENT_LOGS, {
          livemode: event.livemode,
          paymentIntentId: pi.id,
          purchaseType,
          userId,
          moduleId,
        });

        // One row per purchase: update by checkoutSessionId if present.
        if (!checkoutSessionId) {
          console.warn("payment_intent.succeeded missing checkoutSessionId; skipping single-row update", {
            paymentIntentId: pi.id,
          });
          return res.json({ received: true });
        }

        const ref = db.collection(TABLE_PAYMENT_LOGS).doc(String(checkoutSessionId).trim());
        await ref.set(
          {
            status: "succeeded",
            paymentIntentId: pi.id || null,
            purchaseType,
            userId,
            moduleId,
            // Stripe amounts are in the smallest currency unit (USD cents).
            amount,
            amountCents,
            currency: pi.currency || null,
            paidAt: require("firebase-admin").firestore.FieldValue.serverTimestamp(),
            lastEventType: "payment_intent.succeeded",
          },
          { merge: true }
        );

        console.log("Updated payment log doc:", { collection: TABLE_PAYMENT_LOGS, id: checkoutSessionId });
      } catch (e) {
        console.error("Failed to write payment_logs from payment_intent.succeeded:", e);
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
}

// ✅ Stripe webhook: capture raw body explicitly.
// Support both URLs:
// - /payments/webhook
// - /payments/api/payment/webhook
app.post("/webhook", express.raw({ type: "*/*" }), stripeWebhookHandler);
app.post("/api/payment/webhook", express.raw({ type: "*/*" }), stripeWebhookHandler);

// ✅ JSON middleware AFTER webhook
app.use(express.json());

// ✅ Other routes
// Support both direct function URL usage and Firebase Hosting rewrite usage.
// - Direct function URL:   https://...cloudfunctions.net/payments/create-module-checkout-session
// - Hosting rewrite:       https://<site>/api/payment/create-module-checkout-session  -> function path /api/payment/...
app.use("/", paymentRouter);
app.use("/api/payment", paymentRouter);

exports.payments = onRequest(
  {
    region: "us-central1",
    invoker: "public",
    // Bind Firebase Secret Manager secrets so they are available at runtime as process.env.*
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
  app
);
