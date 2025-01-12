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
app.use(express.json());

// Get the allowed origin from the .env file
const corsOptions = {
  origin: `${process.env.ALLOW_ORIGIN}`
};
app.use(cors(corsOptions));

app.use("/api", unitsRoutes); // Prefix all routes with /api
app.use("/api", contentRoutes);
app.use("/api", lessonsRoutes);

// Add this route to handle the root path
app.get('/', (req, res) => {
  res.send('Welcome to the Curriculum Portal API');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
