const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
    createMember,
    getMemberProfile,
    getAllMembers,
    checkInMember,
    assignSalesman,
    freezeMember,
    getMembers,
    getMemberById,
    addNote,
    switchSalesRep,
} = require("../controllers/memberController");

const receptionAccess = [protect, authorize("Receptionist", "Owner")];
const salesAccess = [protect, authorizeRoles("Sales", "Sales Manager", "Owner")];

router.post("/", ...receptionAccess, createMember);

router.get("/", protect, (req, res, next) => {
    if (["Sales", "Sales Manager"].includes(req.user.role)) {
        return getMembers(req, res, next);
    }
    if (["Receptionist", "Owner"].includes(req.user.role)) {
        return getAllMembers(req, res, next);
    }
    return res.status(403).json({ message: "Access denied" });
});

router.get("/:memberId", protect, (req, res, next) => {
    if (["Sales", "Sales Manager"].includes(req.user.role)) {
        return getMemberById(req, res, next);
    }
    if (["Receptionist", "Owner"].includes(req.user.role)) {
        return getMemberProfile(req, res, next);
    }
    return res.status(403).json({ message: "Access denied" });
});

router.post("/:memberId/notes", ...salesAccess, addNote);
router.put("/:memberId/sales-rep", protect, authorizeRoles("Sales Manager", "Owner"), switchSalesRep);

router.post("/:memberId/checkin", ...receptionAccess, checkInMember);
router.patch("/:memberId/assign-sales", ...receptionAccess, assignSalesman);
router.patch("/:memberId/freeze", ...receptionAccess, freezeMember);

module.exports = router;
