/**
 * Rate limiting for the payments function (issue #383, extended here past
 * its original server/-only scope because #439 moved all payment
 * processing onto this backend - the exact routes #383's own audit worried
 * about (#422/#425-adjacent concerns) live here now, and shipping #383
 * without covering them would hardly matter.
 *
 * Ported from server/middleware/rateLimiter.js, trimmed to the one tier
 * this backend needs: there's no broad, mixed-cost route surface here to
 * justify a separate general limiter, just the same Stripe-calling routes
 * server/'s strict tier already covers.
 *
 * Caveat, same as server/'s: this is an in-memory store, so it only limits
 * per function *instance*. Cloud Functions can and does run several
 * concurrent instances under load - exactly when a limit matters most - so
 * this raises the bar significantly without being a hard global ceiling.
 * A shared store (e.g. Firestore- or Memorystore-backed) would close that
 * gap; out of scope here, see #383's follow-up notes.
 */

const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/responseHelpers');

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 20;

function keyByUserOrIp(req) {
  return req.user?.uid || req.ip;
}

function rateLimitHandler(req, res) {
  console.warn(
    `[security] Rate limit exceeded for ${keyByUserOrIp(req)} on ${req.method} ${req.originalUrl}`
  );
  return sendError(res, 'Too many requests. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED');
}

const strictLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  handler: rateLimitHandler,
});

module.exports = { strictLimiter };
