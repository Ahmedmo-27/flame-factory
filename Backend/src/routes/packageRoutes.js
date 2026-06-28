const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const { createPackage, getAllPackages, updatePackage, deletePackage } = require("../controllers/packageController");

// Anyone logged in can view packages
router.get("/", protect, getAllPackages);

// Only Owner and Sales Manager can create/update/delete
router.post("/", protect, authorize("Owner", "Sales Manager"), createPackage);
router.patch("/:id", protect, authorize("Owner", "Sales Manager"), updatePackage);
router.delete("/:id", protect, authorize("Owner", "Sales Manager"), deletePackage);

module.exports = router;
