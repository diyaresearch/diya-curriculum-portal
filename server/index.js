const express = require("express");
const cors = require("cors");

const unitsRoutes = require("./routes/units");
const contentRoutes = require("./routes/units");

const app = express();
app.use(express.json());
app.use(cors());

app.use("/api", unitsRoutes); // Prefix all routes with /api
app.use("/api", contentRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
