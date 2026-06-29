const express = require("express");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const membersRoutes = require("./routes/membersRoutes");
const salesRequestRoutes = require("./routes/salesRequestRoutes");
const packageRoutes = require("./routes/packageRoutes");
const path    = require("path");


const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded files (invitation ID photos, etc.)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/", (req, res) => {
    res.send("FlamFactory API is running");
});

app.use("/api/users", userRoutes);
app.use("/api/members", membersRoutes);
app.use("/api/sales-requests", salesRequestRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/requests", salesRequestRoutes);

module.exports = app;
