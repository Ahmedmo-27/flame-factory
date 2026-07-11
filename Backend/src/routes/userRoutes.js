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
    getSalesTeam,
    getSalesProfile,
    getSubscriptionsByDate,
    getSalesMySubscriptions,
} = require("../controllers/userController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const loginLimiter = require("../middleware/loginLimiter");
const validate = require("../middleware/validate");
const { loginSchema, createStaffSchema } = require("../validation/schemas");

// Public auth — rate limited + validated
router.post("/login", loginLimiter, validate(loginSchema), loginUser);

// Registration is Owner-only (was publicly open — anyone could create Receptionist accounts)
router.post("/register", protect, authorizeRoles("Owner"), registerUser);

router.get("/profile", protect, (req, res) => {
    res.json({ message: "protected route accessed", user: req.user });
});

router.get("/me", protect, getMyProfile);
router.get("/sales-revenue", protect, authorizeRoles("Sales"), getSalesRevenue);
router.get("/sales-manager/revenue", protect, authorizeRoles("Sales Manager", "Owner", "Accountant"), getSalesManagerRevenue);
router.get("/sales-manager/subscriptions", protect, authorizeRoles("Sales Manager", "Owner", "Accountant"), getSubscriptionsByDate);
router.get("/my-subscriptions", protect, authorizeRoles("Sales"), getSalesMySubscriptions);
router.get("/sales-reps", protect, authorizeRoles("Sales Manager", "Owner"), getSalesReps);
router.get("/sales", protect, authorizeRoles("Sales Manager", "Owner", "Accountant", "Receptionist"), getSalesUsers);
router.get("/team", protect, authorizeRoles("Sales Manager", "Owner", "Accountant"), getSalesTeam);
router.get("/team/:id", protect, authorizeRoles("Sales Manager", "Owner", "Accountant"), getSalesProfile);
router.post("/staff", protect, authorizeRoles("Sales Manager", "Owner"), validate(createStaffSchema), createStaffUser);
router.patch("/:id/target", protect, authorizeRoles("Sales Manager"), updateSalesRepTarget);
router.patch("/:id/abilities", protect, authorizeRoles("Sales Manager"), updateSalesRepAbilities);
router.get("/:id", protect, authorizeRoles("Sales Manager", "Owner", "Accountant"), getUserById);

module.exports = router;
