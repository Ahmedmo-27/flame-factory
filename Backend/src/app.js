const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

const userRoutes = require("./routes/userRoutes");
const membersRoutes = require("./routes/membersRoutes");
const salesRequestRoutes = require("./routes/salesRequestRoutes");
const packageRoutes = require("./routes/packageRoutes");
const packageExceptionRoutes = require("./routes/packageExceptionRoutes");
const contractRoutes = require("./routes/contractRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const requestId = require("./middleware/requestId");
const requestLogger = require("./middleware/requestLogger");
const errorHandler = require("./middleware/errorHandler");
const sanitizeRequest = require("./middleware/sanitize");
const { protect } = require("./middleware/authMiddleware");
const authorize = require("./middleware/roleMiddleware");
const { writeAudit } = require("./utils/audit");
const coachRequestRoutes = require("./routes/coachRequestRoutes");


const app = express();
app.set("trust proxy", 1);

// Browser Origin never has a trailing slash — strip so misconfigured env still matches.
const frontendOrigin = (process.env.FRONTEND_ORIGIN || "http://localhost:5173").replace(/\/+$/, "");

app.use(helmet({
    crossOriginResourcePolicy: { policy: "same-site" },
    // API responses; SPA CSP is set on Vercel
    contentSecurityPolicy: false,
}));

app.use(cors({
    origin: frontendOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    credentials: false,
}));

app.use(express.json({ limit: "100kb" }));
app.use(sanitizeRequest);
app.use(requestId);
app.use(requestLogger);

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, try again later" },
});
app.use("/api", globalLimiter);

app.get("/", (req, res) => {
    res.send("Flame Factory API is running");
});

app.use("/api/users", userRoutes);
app.use("/api/members", membersRoutes);
app.use("/api/sales-requests", salesRequestRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/package-exceptions", packageExceptionRoutes);
app.use("/api/accounting", contractRoutes);
app.use("/api/requests", salesRequestRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/coach-requests", coachRequestRoutes);

const uploadsDir = path.join(__dirname, "../uploads");

/**
 * Invitation ID files are PII — require auth. Do not use public express.static.
 */
app.get(
    "/uploads/:filename",
    protect,
    authorize("Receptionist", "Owner", "Sales", "Sales Manager", "Coach", "Accountant"),
    async (req, res) => {
        const safe = path.basename(req.params.filename);
        if (safe !== req.params.filename || safe.includes("..")) {
            return res.status(400).json({ message: "Invalid filename" });
        }

        const filePath = path.join(uploadsDir, safe);
        if (!filePath.startsWith(uploadsDir) || !fs.existsSync(filePath)) {
            return res.status(404).json({ message: "File not found" });
        }

        await writeAudit({
            action: "upload_accessed",
            actor: req.user.id,
            actorRole: req.user.role,
            targetType: "upload",
            targetId: safe,
            req,
        });

        res.sendFile(filePath);
    }
);

app.use(errorHandler);

module.exports = app;
