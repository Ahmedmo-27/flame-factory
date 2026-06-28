const express = require("express");
const router = express.Router();
const {
    getPackages,
    getPackageById,
    createPackage,
    updatePackage,
    deletePackage,
} = require("../controllers/packageController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", authorizeRoles("Sales", "Sales Manager", "Owner"), getPackages);
router.get("/:id", authorizeRoles("Sales", "Sales Manager", "Owner"), getPackageById);
router.post("/", authorizeRoles("Sales Manager", "Owner"), createPackage);
router.put("/:id", authorizeRoles("Sales Manager", "Owner"), updatePackage);
router.delete("/:id", authorizeRoles("Sales Manager", "Owner"), deletePackage);

module.exports = router;
