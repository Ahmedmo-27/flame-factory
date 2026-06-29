const express   = require("express");
const router    = express.Router();
const protect   = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const upload    = require("../config/multer");
const {
    createMember,
    getMemberProfile,
    getAllMembers,
    checkInMember,
    assignSalesman,
    freezeMember,
    addNote,
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

// ── Routes ────────────────────────────────────────────────────────────────────

router.post("/",                        ...writeAccess, createMember);
router.get("/",                         ...readAccess,  getAllMembers);

// All notes overview — must be BEFORE /:memberId to avoid param conflict
router.get("/all-notes",                protect, authorize("Sales Manager", "Owner"), getAllNotes);

router.get("/:memberId",                ...readAccess,  getMemberProfile);
router.post("/:memberId/checkin",       ...readAccess,  checkInMember);
router.patch("/:memberId/assign-sales", ...writeAccess, assignSalesman);
router.patch("/:memberId/freeze",       ...freezeAccess, freezeMember);

// Notes — append-only, no edit/delete
router.post("/:memberId/notes",         ...notesAccess, addNote);

// Invitations — with optional file upload
router.post("/:memberId/invitations",   ...inviteAccess, upload.single("idFile"), addInvitation);

module.exports = router;
