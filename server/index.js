const express = require("express");
const cors = require("cors");
const dotenv = require('dotenv');

const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${env}` });
console.log(`Loaded environment: ${env}`);

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

// Use whitelist-based CORS in production, else allow all for development
if (env === 'production') {
  app.use(cors({
    origin: function(origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        console.log("callback allowed:", origin);
        callback(null, true);
      } else {
        console.log("callback not allowed:", origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
} else {
  // Development: allow all origins
  app.use(cors({
    origin: true,
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

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
