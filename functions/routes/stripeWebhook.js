/**
 * The Stripe webhook — the one endpoint that turns a payment into access.
 *
 * Moved here verbatim from functions/index.js by #439, which collapsed the
 * two backends into this one. There used to be a second webhook in
 * server/routes/payment.js that wrote `payment_logs` with `.add()`, so a
 * redelivered event (Stripe retries) appended another row rather than
 * updating the existing one. This is the idempotent handler — one row per
 * purchase, doc id == checkoutSessionId, written with set(..., {merge:true})
 * — and as of #439 it is the only one that exists.
 */

const { getStripe } = require("../utils/stripeClient");

// Firestore through the one Admin SDK initialization (issue #362). This used
// to call a bare admin.initializeApp() of its own, which ignored the
// credential precedence in config/credentials.js — whichever module happened
// to initialize first won, so an emulator or FIREBASE_SERVICE_ACCOUNT setup
// could be silently bypassed here.
//
// Deliberately not databaseService: that layer can fall back to mock Firebase
// in development, and a payment event must be written to real Firestore or
// not at all. Required lazily so importing this router never initializes
// Firebase as a side effect.
function getDb() {
  return require("../config/firebaseConfig").db;
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
        const purchaseType = session?.metadata?.purchaseType || null;
        if (purchaseType !== "module") {
          return res.json({ received: true });
        }
        const db = getDb();
        const TABLE_PAYMENT_LOGS = "payment_logs";

        const userId = session?.metadata?.userId || null;
        const moduleId = session?.metadata?.moduleId || null;
        const moduleTitle = session?.metadata?.moduleTitle || null;
        const userEmail = session?.metadata?.userEmail || null;
        const userLabel = session?.metadata?.userLabel || null;
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

        // One row per purchase: doc id == checkoutSessionId.
        const ref = db.collection(TABLE_PAYMENT_LOGS).doc(String(session.id || "").trim());
        await ref.set(
          {
            status: "completed",
            paymentIntentId: session.payment_intent || null,
            purchaseType,
            userId,
            userEmail,
            userLabel,
            moduleId,
            moduleTitle,
            livemode: Boolean(event.livemode),
            // Stripe amounts are in the smallest currency unit (USD cents).
            amountTotal,
            amountTotalCents,
            currency: session.currency || null,
            createdAt: require("firebase-admin").firestore.FieldValue.serverTimestamp(),
            completedAt: require("firebase-admin").firestore.FieldValue.serverTimestamp(),
            lastEventType: "checkout.session.completed",
          },
          { merge: true }
        );

        console.log("Updated payment log doc:", { collection: TABLE_PAYMENT_LOGS, id: session.id });

        // Grant access to the module. Previously the webhook wrote this log row
        // and nothing else, so paying for a module granted no access at all
        // (#430). The amount Stripe charged is checked against the price the
        // server recorded when it created the session (#429).
        const { checkChargedAmount, grantModuleEntitlement } = require("./utils/entitlementGrant");
        const amountCheck = checkChargedAmount(session.metadata || {}, amountTotalCents);

        await ref.set(
          {
            priceAtPurchase: session?.metadata?.priceAtPurchase ?? null,
            expectedAmountCents: amountCheck.expectedCents,
            amountMatchesPrice: amountCheck.matches,
          },
          { merge: true }
        );

        if (!amountCheck.matches) {
          console.error("[security] Charged amount does not match module price; withholding entitlement", {
            checkoutSessionId: session.id,
            userId,
            moduleId,
            expectedCents: amountCheck.expectedCents,
            chargedCents: amountCheck.chargedCents,
          });
        } else {
          const TABLE_ENTITLEMENTS = "entitlements";
          const grant = await grantModuleEntitlement(
            db,
            require("firebase-admin"),
            TABLE_ENTITLEMENTS,
            {
              userId,
              moduleId,
              checkoutSessionId: session.id,
              paymentIntentId: session.payment_intent || null,
              amountCents: amountTotalCents,
              priceAtPurchase: session?.metadata?.priceAtPurchase ?? null,
              livemode: event.livemode,
            }
          );
          console.log("Entitlement grant:", { collection: TABLE_ENTITLEMENTS, ...grant });
        }
      } catch (e) {
        console.error("Failed to write payment_logs from checkout.session.completed:", e);
      }
    }

    if (event.type === "payment_intent.succeeded") {
      try {
        const pi = event.data.object || {};
        const purchaseType = pi?.metadata?.purchaseType || null;
        if (purchaseType !== "module") {
          return res.json({ received: true });
        }
        const db = getDb();
        const TABLE_PAYMENT_LOGS = "payment_logs";

        const userId = pi?.metadata?.userId || null;
        const moduleId = pi?.metadata?.moduleId || null;
        const checkoutSessionId = pi?.metadata?.checkoutSessionId || null;
        const moduleTitle = pi?.metadata?.moduleTitle || null;
        const userEmail = pi?.metadata?.userEmail || null;
        const userLabel = pi?.metadata?.userLabel || null;
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
            userEmail,
            userLabel,
            moduleId,
            moduleTitle,
            livemode: Boolean(event.livemode),
            // Stripe amounts are in the smallest currency unit (USD cents).
            amount,
            amountCents,
            currency: pi.currency || null,
            createdAt: require("firebase-admin").firestore.FieldValue.serverTimestamp(),
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

module.exports = { stripeWebhookHandler };
