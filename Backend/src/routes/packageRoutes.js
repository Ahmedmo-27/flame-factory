const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const validate = require("../middleware/validate");
const { createPackageSchema, updatePackageSchema } = require("../validation/schemas");
const { createPackage, getAllPackages, updatePackage, deletePackage } = require("../controllers/packageController");

router.get("/", protect, getAllPackages);

router.post("/", protect, authorize("Owner", "Sales Manager"), validate(createPackageSchema), createPackage);
router.patch("/:id", protect, authorize("Owner", "Sales Manager"), validate(updatePackageSchema), updatePackage);
router.delete("/:id", protect, authorize("Owner", "Sales Manager"), deletePackage);

module.exports = router;
