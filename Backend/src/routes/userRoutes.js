const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getSalesUsers } = require("../controllers/userController");
const protect = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected routes
router.get("/profile", protect, (req, res) => {
    res.json({ message: "protected route accessed", user: req.user });
});

// Get all sales/Sales Manager users — for assign-sales dropdown
router.get("/sales", protect, getSalesUsers);

module.exports = router;
