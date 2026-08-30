/**
 * Module purchase entitlements (issues #429, #430).
 *
 * Payment and access were entirely disconnected: the webhook wrote a
 * payment_logs row and nothing else, so buying a module granted nothing.
 *
 * The entitlement id is `{userId}_{moduleId}`, which makes the grant
 * idempotent by construction — a replayed Stripe event writes the same
 * document instead of a second one.
 */

/**
 * Does the amount Stripe charged match what the module claimed at checkout?
 *
 * The session metadata carries the price the server read when it created the
 * session. If those disagree, the module's price changed underneath the
 * purchase (or was tampered with) and the mismatch must be recorded rather
 * than silently fulfilled (#429).
 *
 * @returns {{matches: boolean, expectedCents: number|null, chargedCents: number|null}}
 */
function checkChargedAmount(metadata, amountTotalCents) {
  const raw = metadata && metadata.expectedAmountCents;
  const expectedCents = raw === undefined || raw === null || raw === '' ? null : Number(raw);
  const chargedCents =
    typeof amountTotalCents === 'number' && Number.isFinite(amountTotalCents)
      ? amountTotalCents
      : null;

  if (expectedCents === null || !Number.isFinite(expectedCents) || chargedCents === null) {
    // Sessions created before this metadata existed cannot be checked; treat
    // them as matching so old purchases still fulfil, but the caller records
    // that the comparison was not possible.
    return { matches: true, expectedCents: Number.isFinite(expectedCents) ? expectedCents : null, chargedCents };
  }

  return { matches: expectedCents === chargedCents, expectedCents, chargedCents };
}

/**
 * Grant access to a purchased module, exactly once.
 *
 * @returns {Promise<{granted: boolean, reason?: string, id?: string}>}
 */
async function grantModuleEntitlement(db, admin, table, { userId, moduleId, checkoutSessionId, paymentIntentId, amountCents, priceAtPurchase, livemode }) {
  if (!userId || !moduleId) {
    return { granted: false, reason: 'missing userId or moduleId' };
  }

  const id = `${userId}_${moduleId}`;

  // set() with merge is deliberate rather than create(): a replayed event must
  // be harmless, not an error, and Stripe retries events routinely.
  await db.collection(table).doc(id).set(
    {
      userId,
      moduleId,
      source: 'stripe_checkout',
      checkoutSessionId: checkoutSessionId || null,
      paymentIntentId: paymentIntentId || null,
      amountCents: typeof amountCents === 'number' ? amountCents : null,
      priceAtPurchase: priceAtPurchase === undefined ? null : priceAtPurchase,
      livemode: Boolean(livemode),
      grantedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { granted: true, id };
}

module.exports = { checkChargedAmount, grantModuleEntitlement };
