const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const { createPackage, getAllPackages } = require("../controllers/packageController");

// Anyone logged in can view packages
router.get("/", protect, getAllPackages);

// Only owner and Sales Manager can create packages
router.post("/", protect, authorize("owner", "Sales Manager"), createPackage);

module.exports = router;
