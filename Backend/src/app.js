const express = require("express");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const membersRoutes = require("./routes/membersRoutes");
const packageRoutes = require("./routes/packageRoutes");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("FlamFactory API is running");
});

const memberRoutes = require("./routes/memberRoutes");
const salesRequestRoutes = require("./routes/salesRequestRoutes");

app.use("/api/users", userRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/sales-requests", salesRequestRoutes);
app.use("/api/members", membersRoutes);
app.use("/api/packages", packageRoutes);

module.exports = app;
