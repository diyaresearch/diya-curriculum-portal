const express = require("express");
const cors = require("cors");

const unitsRoutes = require("./routes/units");
const contentRoutes = require("./routes/units");
const lessonsRoutes = require("./routes/lessons");

const app = express();
app.use(express.json());
app.use(cors());

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
