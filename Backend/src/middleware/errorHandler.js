const logger = require("../utils/logger");

function errorHandler(err, req, res, _next) {
    const status = err.status || err.statusCode || 500;

    logger.error("http", "Unhandled request error", {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        status,
        userId: req.user?.id,
        userRole: req.user?.role,
        error: err.message,
        stack: err.stack,
    });

    if (res.headersSent) return;

    res.status(status).json({
        message: status === 500 ? "Server error" : err.message,
        ...(process.env.NODE_ENV !== "production" && { error: err.message }),
    });
}

module.exports = errorHandler;
