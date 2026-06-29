const logger = require("../utils/logger");

const SENSITIVE_PATHS = ["/api/users/login", "/api/users/register", "/api/users/staff"];

function requestLogger(req, res, next) {
    const start = Date.now();
    const isAuthRoute = SENSITIVE_PATHS.some((p) => req.originalUrl.startsWith(p));

    res.on("finish", () => {
        const durationMs = Date.now() - start;
        const meta = {
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            durationMs,
            ip: req.ip || req.socket?.remoteAddress,
            userAgent: req.get("user-agent"),
        };

        if (isAuthRoute) {
            logger.auth(res.statusCode >= 400 ? "warn" : "info", "Auth HTTP request", meta);
        } else {
            logger.info("http", "Request completed", meta);
        }
    });

    next();
}

module.exports = requestLogger;
