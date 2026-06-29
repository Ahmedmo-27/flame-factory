const express   = require("express");
const router    = express.Router();
const { protect, authorizeRoles }   = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const upload    = require("../config/multer");
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
    addInvitation,
    getAllNotes
} = require("../controllers/memberController");

// ── Role groups ───────────────────────────────────────────────────────────────

// Read members: all authenticated staff can view
const readAccess  = [protect, authorize("Receptionist", "Owner", "Sales", "Sales Manager", "Coach", "Accountant")];

// Write members: Receptionist + Owner create/modify
const writeAccess = [protect, authorize("Receptionist", "Owner")];

// Notes: Receptionist, Owner, Sales, Sales Manager
const notesAccess = [protect, authorize("Receptionist", "Owner", "Sales", "Sales Manager")];

// Freeze: Receptionist, Owner, Sales, Sales Manager
const freezeAccess = [protect, authorize("Receptionist", "Owner", "Sales", "Sales Manager")];

// Invitations: same as notes
const inviteAccess = [protect, authorize("Receptionist", "Owner", "Sales", "Sales Manager")];

const salesAccess = [protect, authorizeRoles("Sales", "Sales Manager", "Owner")];


// ── Routes ────────────────────────────────────────────────────────────────────

router.post("/", ...writeAccess, createMember);

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

router.post("/:memberId/checkin", ...writeAccess, checkInMember);
router.patch("/:memberId/assign-sales", ...writeAccess, assignSalesman);
router.patch("/:memberId/freeze", ...freezeAccess, freezeMember);
router.get("/all-notes",                protect, authorize("Sales Manager", "Owner"), getAllNotes);


module.exports = router;
