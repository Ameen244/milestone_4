const express = require("express");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/v1");
const app = express();

app.use(cookieParser());
app.use(express.json());
app.use("/v1", authRoutes);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
