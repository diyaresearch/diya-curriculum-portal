const express = require("express");
const cors = require("cors");
const dotenv = require('dotenv');

// Load environment configuration
const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${env}` });
console.log(`Loaded environment: ${env}`);

// Validate environment variables and set defaults
const { validateAndExit, setDefaults } = require('./utils/envValidator');
validateAndExit(false); // Don't exit on failure, just warn
setDefaults();

const unitsRoutes = require("./routes/units");
const contentRoutes = require("./routes/units"); 
const lessonsRoutes = require("./routes/lessons");
const modulesRoutes = require("./routes/modules");
const userRoutes = require("./routes/user");
const subscriptionRoutes = require("./routes/subscription");
const paymentRoutes = require("./routes/payment");

const app = express();
// Stripe webhooks require the *raw* request body for signature verification.
// We keep normal JSON parsing, but capture the raw bytes for the webhook route.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      try {
        if (req.originalUrl && req.originalUrl.startsWith("/api/payment/webhook")) {
          req.rawBody = buf;
        }
      } catch (_) {
        // ignore
      }
    },
  })
);

// Get allowed origins from env, default empty array
const allowedOrigins = process.env.SERVER_ALLOW_ORIGIN
  ? process.env.SERVER_ALLOW_ORIGIN.split(',').map(url => url.trim())
  : [];
  const ALLOWED_ORIGINS = new Set([
    "https://diyaresearch.org",
    "https://curriculum-portal-1ce8f.web.app",
    "https://curriculum-portal-1ce8f.firebaseapp.com",
    // Production custom domain (issue #421 follow-up)
    "https://learn.diyaresearch.org",
  ]);

// Use whitelist-based CORS in production, secure localhost-only in development
if (env === 'production') {
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow server-to-server or same-origin requests (origin may be undefined)
        if (!origin) return callback(null, true);
  
        if (ALLOWED_ORIGINS.has(origin)) return callback(null, true);
  
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
  
  // Ensure preflight always succeeds
  app.options("*", cors());
  
} else {
  // Development: allow only localhost origins for security
  const devAllowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
  ];

  app.use(cors({
    origin: function(origin, callback) {
      // Allow requests without origin (e.g., mobile apps, Postman) in development only
      if (!origin || devAllowedOrigins.indexOf(origin) !== -1) {
        console.log("CORS allowed (dev):", origin || 'no-origin');
        callback(null, true);
      } else {
        console.log("CORS blocked (dev):", origin);
        callback(new Error('Not allowed by CORS - development mode'));
      }
    },
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
    credentials: true
  }));
}

app.use("/api", unitsRoutes);
app.use("/api", contentRoutes);
app.use("/api", lessonsRoutes);
app.use("/api", modulesRoutes);
app.use("/api/user", userRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/payment", paymentRoutes);

app.get('/', (req, res) => {
  res.send('Welcome to the Curriculum Portal API');
});

// Liveness + Firestore reachability. Returns 503 when the Admin credential is
// dead, so an outage like issue #418 is visible to a health check instead of
// only surfacing as 500s on every data route.
app.get('/api/health', async (req, res) => {
  const { db } = require('./config/firebaseConfig');
  const { verifyCredential } = require('./config/credentials');

  const result = await verifyCredential(db);
  if (result.ok) {
    return res.json({ status: 'ok', firestore: 'reachable' });
  }

  return res.status(503).json({
    status: 'degraded',
    firestore: 'unreachable',
    error: result.error.message,
  });
});

// Import error handlers
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 404 handler for unmatched routes (must be before global error handler)
app.use(notFoundHandler);

// Global error handler (must be LAST middleware)
app.use(globalErrorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  checkFirestoreOnBoot();
});

/**
 * Confirm at boot that the Admin credential actually works. The server still
 * starts (so /api/health stays answerable), but the log says plainly what is
 * broken and how to fix it rather than leaving every route to fail with a 500.
 */
async function checkFirestoreOnBoot() {
  let db;
  let source = 'unknown';
  try {
    const { resolveCredential, verifyCredential } = require('./config/credentials');
    source = resolveCredential().source;
    db = require('./config/firebaseConfig').db;

    const result = await verifyCredential(db);
    if (result.ok) {
      console.log('Firestore reachable - Admin credential is valid');
      return;
    }

    const { remediationFor } = require('./config/credentials');
    console.error(
      '\nFirestore is UNREACHABLE - API routes backed by Firestore will fail.\n' +
        `  Reason: ${result.error.message}\n` +
        `  ${remediationFor(source)}\n`
    );
  } catch (error) {
    console.error('\nFirebase Admin is not configured:\n' + error.message + '\n');
  }
}
