const express = require("express");
const app = express();
app.use(express.json());

//routes
const userRoutes = require("./routes/userRoutes");
const memberRoutes = require("./routes/memberRoutes");
const salesRequestRoutes = require("./routes/salesRequestRoutes");

app.use("/api/users", userRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/sales-requests", salesRequestRoutes);



module.exports = app;