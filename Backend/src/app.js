const express = require("express");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const membersRoutes = require("./routes/membersRoutes");
const salesRequestRoutes = require("./routes/salesRequestRoutes");
const packageRoutes = require("./routes/packageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const requestId = require("./middleware/requestId");
const requestLogger = require("./middleware/requestLogger");
const errorHandler = require("./middleware/errorHandler");
const coachRequestRoutes = require("./routes/coachRequestRoutes");
const path    = require("path");


const app = express();
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());
app.use(requestId);
app.use(requestLogger);

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
app.use("/api/notifications", notificationRoutes);
app.use("/api/coach-requests", coachRequestRoutes);

app.use(errorHandler);

module.exports = app;
