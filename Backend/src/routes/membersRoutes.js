const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
    createMember,
    getMemberProfile,
    getAllMembers,
    checkInMember,
    assignSalesman,
    freezeMember
} = require("../controllers/memberController");

// Receptionist and Owner both have access
const receptionAccess = [protect, authorize("Receptionist", "Owner")];

router.post("/",                          ...receptionAccess, createMember);
router.get("/",                           ...receptionAccess, getAllMembers);
router.get("/:memberId",                  ...receptionAccess, getMemberProfile);
router.post("/:memberId/checkin",         ...receptionAccess, checkInMember);
router.patch("/:memberId/assign-sales",   ...receptionAccess, assignSalesman);
router.patch("/:memberId/freeze",         ...receptionAccess, freezeMember);

module.exports = router;
