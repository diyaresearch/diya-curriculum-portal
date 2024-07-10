const express = require("express");
const unitsRoutes = require("./routes/units");
const contentRoutes = require("./routes/units");

const app = express();
app.use(express.json());

app.use("/api", unitsRoutes); // Prefix all routes with /api
app.use("/api", contentRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
