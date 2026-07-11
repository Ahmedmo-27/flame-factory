const jwt = require("jsonwebtoken");

function signToken(user, options = {}) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: options.expiresIn || "1h" }
  );
}

function authHeader(user, options = {}) {
  return { Authorization: `Bearer ${signToken(user, options)}` };
}

function expiredToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "-1s" }
  );
}

module.exports = { signToken, authHeader, expiredToken };
