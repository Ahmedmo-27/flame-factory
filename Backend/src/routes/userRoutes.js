const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getSalesUsers, getSalesTeam, getSalesProfile } = require("../controllers/userController");
const protect   = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

router.post("/register", registerUser);
router.post("/login",    loginUser);

router.get("/profile", protect, (req, res) => {
    res.json({ message: "protected route accessed", user: req.user });
});

// Dropdown — all authenticated users
router.get("/sales", protect, getSalesUsers);

// Full team list with stats — Sales Manager and Owner only
router.get("/team",         protect, authorize("Sales Manager", "Owner"), getSalesTeam);
router.get("/team/:id",     protect, authorize("Sales Manager", "Owner"), getSalesProfile);

module.exports = router;
