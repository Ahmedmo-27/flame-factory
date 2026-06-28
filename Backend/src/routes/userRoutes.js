const express = require("express");
const router = express.Router();
const {
    registerUser,
    loginUser,
    getSalesRevenue,
    getSalesManagerRevenue,
    getSalesReps,
    getMyProfile,
    getUserById,
    updateSalesRepAbilities,
} = require("../controllers/userController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.get("/profile", protect, (req, res) => {
    res.json({
        message: "protected route accessed",
        user: req.user
    });
});

router.get("/me", protect, getMyProfile);
router.get("/sales-revenue", protect, getSalesRevenue);
router.get("/sales-manager/revenue", protect, authorizeRoles("Sales Manager", "Owner"), getSalesManagerRevenue);
router.get("/sales-reps", protect, authorizeRoles("Sales Manager", "Owner"), getSalesReps);
router.get("/:id", protect, getUserById);
router.patch("/:id/abilities", protect, authorizeRoles("Sales Manager"), updateSalesRepAbilities);

router.post("/register", registerUser);
router.post("/login", loginUser);

module.exports = router;