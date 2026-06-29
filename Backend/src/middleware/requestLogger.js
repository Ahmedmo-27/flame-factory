const logger = require("../utils/logger");

const SENSITIVE_PATHS = ["/api/users/login", "/api/users/register", "/api/users/staff"];

function requestLogger(req, res, next) {
    const start = Date.now();
    const isAuthRoute = SENSITIVE_PATHS.some((p) => req.originalUrl.startsWith(p));

    let responseBody;
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        responseBody = body;
        return originalJson(body);
    };

    res.on("finish", () => {
        const durationMs = Date.now() - start;
        const meta = {
            requestId: req.requestId,
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            durationMs,
            ip: req.ip || req.socket?.remoteAddress,
            userAgent: req.get("user-agent"),
            userId: req.user?.id,
            userRole: req.user?.role,
        };

        if (Object.keys(req.query).length) {
            meta.query = req.query;
        }

        if (res.statusCode >= 400) {
            const reason = responseBody?.message || responseBody?.error;
            if (reason) meta.reason = reason;
        }

        if (isAuthRoute) {
            const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
            logger.auth(level, "Auth HTTP request", meta);
            return;
        }

        if (res.statusCode >= 500) {
            logger.error("http", "Request failed", meta);
        } else if (res.statusCode >= 400) {
            logger.warn("http", "Request rejected", meta);
        } else {
            logger.info("http", "Request completed", meta);
        }
    });

    next();
}

module.exports = requestLogger;
