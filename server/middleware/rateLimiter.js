/**
 * Rate limiting (issue #383).
 *
 * There was no rate limiting anywhere in this server: no protection against
 * a scripted flood, and no throttle on the auth-gated write endpoints that
 * actually cost something to abuse (Stripe calls in particular - #422/#425
 * made those endpoints check what they're given, not what protects them
 * from being hit a thousand times a minute by one legitimate account).
 *
 * `RATE_LIMIT_WINDOW_MS`/`RATE_LIMIT_MAX_REQUESTS` were already declared in
 * every `.env.*` file and listed in envValidator.js's optional vars with
 * defaults - reading the env gave the impression rate limiting was active.
 * It wasn't; nothing ever read them. This wires them up.
 */

const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/responseHelpers');

const GENERAL_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000; // 15 min
const GENERAL_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

// A stricter budget for endpoints that are either expensive (real Stripe
// API calls) or a meaningful step in a flow worth throttling harder than
// general browsing (registration, payment creation/confirmation,
// subscription upgrades). Deliberately not env-configurable like the
// general limiter above - this number is a security posture, not a
// per-environment tuning knob, and shouldn't drift by accident the way the
// dead env vars did before this file existed.
const STRICT_WINDOW_MS = 15 * 60 * 1000;
const STRICT_MAX_REQUESTS = 20;

/**
 * Key by the authenticated user when there is one (routes that mount this
 * after `authenticateUser` have `req.user.uid` by the time this runs), so
 * users behind a shared IP - a school network is the obvious case here -
 * don't share one bucket. Falls back to IP for anything unauthenticated.
 */
function keyByUserOrIp(req) {
  return req.user?.uid || req.ip;
}

function rateLimitHandler(req, res) {
  console.warn(
    `[security] Rate limit exceeded for ${keyByUserOrIp(req)} on ${req.method} ${req.originalUrl}`
  );
  return sendError(res, 'Too many requests. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED');
}

// Applied once, globally, to every /api/* route. Health checks are exempt -
// uptime monitoring polls /api/health regularly and legitimately, and rate
// limiting it would turn monitoring traffic into false "degraded" signals.
const generalLimiter = rateLimit({
  windowMs: GENERAL_WINDOW_MS,
  max: GENERAL_MAX_REQUESTS,
  standardHeaders: true, // RateLimit-* response headers
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  handler: rateLimitHandler,
  skip: (req) => req.path === '/health',
});

// Applied per-route, after `authenticateUser`, to the endpoints named above.
const strictLimiter = rateLimit({
  windowMs: STRICT_WINDOW_MS,
  max: STRICT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  handler: rateLimitHandler,
});

module.exports = { generalLimiter, strictLimiter };
