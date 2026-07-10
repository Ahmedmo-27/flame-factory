const express = require("express");
const router = express.Router();
const {
    registerUser,
    loginUser,
    getSalesRevenue,
    getSalesManagerRevenue,
    getSalesUsers,
    getSalesReps,
    getMyProfile,
    getUserById,
    updateSalesRepTarget,
    createStaffUser,
    updateSalesRepAbilities,
    updateCoachRepAbilities,
    getSalesTeam,
    getSalesProfile,
    getSubscriptionsByDate,
    getSalesMySubscriptions,
    change_Role,
    getCoachTeam,
    getCoachProfile,
} = require("../controllers/userController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login",    loginUser);

router.get("/profile", protect, (req, res) => {
    res.json({ message: "protected route accessed", user: req.user });
});

router.get("/me", protect, getMyProfile);
router.get("/sales-revenue", protect, getSalesRevenue);
router.get("/sales-manager/revenue", protect, authorizeRoles("Sales Manager", "Owner", "Accountant"), getSalesManagerRevenue);
router.get("/sales-manager/subscriptions", protect, authorizeRoles("Sales Manager", "Owner", "Accountant"), getSubscriptionsByDate);
router.get("/my-subscriptions", protect, authorizeRoles("Sales"), getSalesMySubscriptions);
router.get("/sales-reps", protect, authorizeRoles("Sales Manager", "Owner"), getSalesReps);
router.get("/sales", protect, getSalesUsers);
router.get("/team", protect, authorizeRoles("Sales Manager", "Owner", "Accountant"), getSalesTeam);
router.get("/team/:id", protect, authorizeRoles("Sales Manager", "Owner", "Accountant"), getSalesProfile);
router.get("/coach-team", protect, authorizeRoles("Coach Manager", "Owner"), getCoachTeam);
router.get("/coach-team/:id", protect, authorizeRoles("Coach Manager", "Owner"), getCoachProfile);
router.post("/staff", protect, authorizeRoles("Sales Manager", "Owner"), createStaffUser);
router.patch("/:id/target", protect, authorizeRoles("Sales Manager"), updateSalesRepTarget);
router.patch("/:id/abilities", protect, authorizeRoles("Sales Manager"), updateSalesRepAbilities);
router.patch("/:id/coach-abilities", protect, authorizeRoles("Coach Manager"), updateCoachRepAbilities);

router.get("/changerole/:id/:new_role",protect,authorizeRoles("Owner"),change_Role)

router.get("/:id", protect, getUserById);

module.exports = router;
