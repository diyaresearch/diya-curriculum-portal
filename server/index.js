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
app.use(express.json());

// Get allowed origins from env, default empty array
const allowedOrigins = process.env.SERVER_ALLOW_ORIGIN
  ? process.env.SERVER_ALLOW_ORIGIN.split(',').map(url => url.trim())
  : [];

// Use whitelist-based CORS in production, secure localhost-only in development
if (env === 'production') {
  app.use(cors({
    origin: function(origin, callback) {
      // Security fix: Only allow explicitly whitelisted origins
      // Remove !origin condition that allowed requests without origin headers
      if (origin && allowedOrigins.indexOf(origin) !== -1) {
        console.log("CORS allowed:", origin);
        callback(null, true);
      } else {
        console.log("CORS blocked:", origin || 'no-origin');
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));
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

// Import error handlers
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 404 handler for unmatched routes (must be before global error handler)
app.use(notFoundHandler);

// Global error handler (must be LAST middleware)
app.use(globalErrorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
