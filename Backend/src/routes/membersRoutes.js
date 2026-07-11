const express   = require("express");
const router    = express.Router();
const { protect, authorizeRoles }   = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const upload    = require("../config/multer");
const validate  = require("../middleware/validate");
const {
    createMemberSchema,
    freezeMemberSchema,
    addNoteSchema,
    invitationSchema,
    assignPackageSchema,
} = require("../validation/schemas");
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
    assignPackage,
} = require("../controllers/memberController");

// ── Role groups ───────────────────────────────────────────────────────────────

const readAccess  = [protect, authorize("Receptionist", "Owner", "Sales", "Sales Manager", "Coach", "Accountant")];
const writeAccess = [protect, authorize("Receptionist", "Owner", "Sales Manager")];
const notesAccess = [protect, authorize("Receptionist", "Owner", "Sales", "Sales Manager")];
const freezeAccess = [protect, authorize("Receptionist", "Owner", "Sales", "Sales Manager")];
const inviteAccess = [protect, authorize("Receptionist", "Owner", "Sales", "Sales Manager")];

// ── Routes ────────────────────────────────────────────────────────────────────

router.post("/", ...writeAccess, validate(createMemberSchema), createMember);
router.post("/bulk-transfer-sales", protect, authorizeRoles("Sales Manager", "Owner"), bulkTransferSalesReps);

router.get("/", protect, (req, res, next) => {
    if (["Sales", "Sales Manager"].includes(req.user.role)) {
        return getMembers(req, res, next);
    }
    if (["Receptionist", "Owner", "Accountant"].includes(req.user.role)) {
        return getAllMembers(req, res, next);
    }
    return res.status(403).json({ message: "Access denied" });
});

router.get("/all-notes", protect, authorize("Sales Manager", "Owner"), getAllNotes);

router.get("/:memberId", protect, (req, res, next) => {
    const profileRoles = ["Receptionist", "Owner", "Sales", "Sales Manager", "Coach", "Accountant"];
    if (profileRoles.includes(req.user.role)) {
        return getMemberProfile(req, res, next);
    }
    return res.status(403).json({ message: "Access denied" });
});

router.post("/:memberId/notes", ...notesAccess, validate(addNoteSchema), addNote);
router.post("/:memberId/invitations", ...inviteAccess, upload.single("idFile"), validate(invitationSchema), addInvitation);
router.put("/:memberId/sales-rep", protect, authorizeRoles("Sales Manager", "Owner"), switchSalesRep);

router.post("/:memberId/checkin", ...writeAccess, checkInMember);
router.patch("/:memberId/assign-sales", ...writeAccess, assignSalesman);
router.patch("/:memberId/freeze", ...freezeAccess, validate(freezeMemberSchema), freezeMember);
router.post("/:memberId/package", protect, authorize("Accountant"), validate(assignPackageSchema), assignPackage);

module.exports = router;
