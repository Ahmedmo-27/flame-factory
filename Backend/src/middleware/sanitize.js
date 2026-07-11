const mongoSanitize = require("express-mongo-sanitize");

/**
 * Express 5-compatible NoSQL injection sanitizer.
 * express-mongo-sanitize cannot replace req.query (read-only getter in Express 5),
 * so we sanitize body/params in place and mutate query keys individually.
 */
function sanitizeRequest(req, _res, next) {
    if (req.body && typeof req.body === "object") {
        mongoSanitize.sanitize(req.body, { replaceWith: "_" });
    }

    if (req.params && typeof req.params === "object") {
        mongoSanitize.sanitize(req.params, { replaceWith: "_" });
    }

    if (req.query && typeof req.query === "object") {
        const cleaned = mongoSanitize.sanitize({ ...req.query }, { replaceWith: "_" });
        for (const key of Object.keys(req.query)) {
            delete req.query[key];
        }
        Object.assign(req.query, cleaned);
    }

    next();
}

module.exports = sanitizeRequest;
