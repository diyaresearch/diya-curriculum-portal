const express = require("express");
const cors = require("cors");

const unitsRoutes = require("./routes/units");
const contentRoutes = require("./routes/units");
const lessonsRoutes = require("./routes/lessons");

const app = express();
app.use(express.json());

const allowedOrigins = [
    'https://curriculum-portal-1ce8f.web.app',
    'http://localhost:3000'  // For local development
];

app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
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
