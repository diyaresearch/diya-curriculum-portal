const express = require("express");
const cors = require("cors");
// read dotenv
//require('dotenv').config();

const dotenv = require('dotenv');

// Determine env to default (development if not specified)
const env = process.env.NODE_ENV || 'development';

// Load appropriate env file
dotenv.config({path: `.env.${env}` });
console.log(`Loaded environment: ${env}`);

const unitsRoutes = require("./routes/units");
const contentRoutes = require("./routes/units");
const lessonsRoutes = require("./routes/lessons");

const app = express();
app.use(express.json())

// Get the allowed origin from the .env file
const allowedOrigins = [
  'https://curriculum-portal-1ce8f.web.app',
  'http://localhost:3000'  // For local development
];

console.log("allowedOrigin:", allowedOrigins)

app.use(cors({
  origin: function(origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        console.log("callback true:", origin)
          callback(null, true);
      } else {
        console.log("callback false:", origin)
          callback(new Error('Not allowed by CORS'));
      }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use("/api", unitsRoutes);
app.use("/api", contentRoutes);
app.use("/api", lessonsRoutes);

// Add this route to handle the root path
app.get('/', (req, res) => {
  res.send('Welcome to the Curriculum Portal API');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
