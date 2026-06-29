const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

const protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        logger.auth("warn", "Auth middleware: no token", {
            path: req.originalUrl,
            method: req.method,
            ip: req.ip,
        });
        return res.status(401).json({ message: "Not authorized, no token" });
    }

    if (!process.env.JWT_SECRET) {
        logger.auth("error", "Auth middleware: JWT_SECRET missing", {
            path: req.originalUrl,
        });
        return res.status(500).json({ message: "Server misconfigured: JWT_SECRET is missing" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        logger.auth("warn", "Auth middleware: token verification failed", {
            path: req.originalUrl,
            method: req.method,
            error: err.name,
            message: err.message,
            hasJwtSecret: Boolean(process.env.JWT_SECRET),
        });
        res.status(401).json({ message: "Token failed" });
    }
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            logger.auth("warn", "Auth middleware: role not authorized", {
                path: req.originalUrl,
                userRole: req.user.role,
                allowedRoles: roles,
                userId: req.user.id,
            });
            return res.status(403).json({
                message: `User role ${req.user.role} is not authorized to access this route`,
            });
        }
        next();
    };
};

module.exports = { protect, authorizeRoles };
