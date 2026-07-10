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
    bulkTransferSalesReps,
    addInvitation,
    getAllNotes,
    sessionCheckIn_for_couch,
    assignCoach,
    addCouch_notes,
    switchCoach,,
    assignPackage,
    getTodayCheckIns,
    uploadNationalId,
    addAlert,
    deactivateAlert,
    blockMember,
    unblockMember
} = require("../controllers/memberController");

// ── Role groups ───────────────────────────────────────────────────────────────

// Read members: all authenticated staff can view
const readAccess  = [protect, authorize("Receptionist", "Owner", "Sales", "Sales Manager", "Coach", "Accountant")];

// Write members: Receptionist + Owner + Sales Manager create
const writeAccess = [protect, authorize("Receptionist", "Owner", "Sales Manager","Sales")];

// Notes: Receptionist, Owner, Sales, Sales Manager
const notesAccess = [protect, authorize("Receptionist", "Owner", "Sales", "Sales Manager","Coach","Coach Manager")];

// Freeze: Receptionist, Owner, Sales, Sales Manager
const freezeAccess = [protect, authorize("Receptionist", "Owner", "Sales", "Sales Manager")];

// Invitations: same as notes
const inviteAccess = [protect, authorize("Receptionist", "Owner", "Sales", "Sales Manager")];

const salesAccess = [protect, authorizeRoles("Sales", "Sales Manager", "Owner")];


// ── Routes ────────────────────────────────────────────────────────────────────

router.post("/", ...writeAccess, createMember);
router.post("/bulk-transfer-sales", protect, authorizeRoles("Sales Manager", "Owner"), bulkTransferSalesReps);

router.get("/", protect, (req, res, next) => {
    if (["Sales", "Sales Manager","Coach", "Coach Manager"].includes(req.user.role)) {
        return getMembers(req, res, next);
    }
    if (["Receptionist", "Owner", "Accountant"].includes(req.user.role)) {
        return getAllMembers(req, res, next);
    }
    return res.status(403).json({ message: "Access denied" });
});

// All members (for global search — all authenticated staff)
router.get("/all", protect, authorize("Receptionist", "Owner", "Sales", "Sales Manager", "Accountant"), getAllMembers);

router.get("/all-notes", protect, authorize("Sales Manager", "Owner","Coach Manager"), getAllNotes);
router.get("/today-checkins", protect, authorize("Receptionist", "Owner", "Sales", "Sales Manager"), getTodayCheckIns);

router.get("/:memberId", protect, (req, res, next) => {
    const profileRoles = ["Receptionist", "Owner", "Sales", "Sales Manager", "Coach", "Accountant"];
    if (profileRoles.includes(req.user.role)) {
        return getMemberProfile(req, res, next);
    }
    return res.status(403).json({ message: "Access denied" });
});

router.post("/:memberId/notes", ...notesAccess, addNote);
router.post("/:memberId/invitations", ...inviteAccess, upload.single("idFile"), addInvitation);
router.put("/:memberId/sales-rep", protect, authorizeRoles("Sales Manager", "Owner"), switchSalesRep);
router.post("/:memberId/alerts",protect,authorize("Receptionist", "Sales", "Sales Manager"),addAlert);
router.post("/:memberId/checkin", ...writeAccess, checkInMember);
router.patch("/:memberId/alerts/:alertId/deactivate", protect, authorize("Receptionist", "Sales", "Sales Manager", "Owner"), deactivateAlert);
router.patch("/:memberId/assign-sales", ...writeAccess, assignSalesman);
router.patch("/:memberId/freeze", ...freezeAccess, freezeMember);
router.patch("/:memberId/block", protect, authorize("Sales Manager"), blockMember);
router.patch("/:memberId/unblock", protect, authorize("Sales Manager"), unblockMember);
router.post("/:memberId/package", protect, authorize("Accountant"), assignPackage);
router.patch("/:memberId/national-id", protect, authorize("Accountant"), upload.single("nationalIdFile"), uploadNationalId);

router.post("/PTcheckin", protect, authorizeRoles("Coach", "Coach Manager"), sessionCheckIn_for_couch);
router.post("/:memberId/checkin", ...writeAccess, checkInMember);

// ── Coach routes ──────────────────────────────────────────────────────────────

// Assign a coach to a member — Coach Manager / Owner
router.patch("/:memberId/assign-coach", protect, authorizeRoles("Coach Manager", "Owner"), assignCoach);

// Transfer a member to a different coach — Coach Manager / Owner
router.put("/:memberId/coach-rep", protect, authorizeRoles("Coach Manager", "Owner"), switchCoach);

// Add a coach note to a member — Coach / Coach Manager
router.post("/:memberId/couch-notes", protect, authorizeRoles("Coach", "Coach Manager"), addCouch_notes);

// Get a single member by id/systemId/memberId — all staff
router.get("/by/:memberId", ...readAccess, getMemberById);

module.exports = router;
