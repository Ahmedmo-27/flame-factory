const { randomUUID } = require("crypto");

function requestId(req, res, next) {
    req.requestId = req.get("X-Request-Id") || randomUUID().slice(0, 8);
    res.setHeader("X-Request-Id", req.requestId);
    next();
}

module.exports = requestId;
