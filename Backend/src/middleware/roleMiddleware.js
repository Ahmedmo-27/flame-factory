// Usage: authorize("Owner", "Receptionist")
// Note: role names must match exactly what is stored in User.role
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Access denied. Required: ${roles.join(" or ")}`
            });
        }
        next();
    };
};

module.exports = authorize;
