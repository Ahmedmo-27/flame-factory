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

// Receptionist and owner both have access
const receptionAccess = [protect, authorize("receptionist", "owner")];

//  Add new member
router.post("/", ...receptionAccess, createMember);

// Get all members
router.get("/", ...receptionAccess, getAllMembers);

//Get single member profile + full activity
router.get("/:memberId", ...receptionAccess, getMemberProfile);

// POST  Check in a member
router.post("/:memberId/checkin", ...receptionAccess, checkInMember);

// PATCH  Assign salesman to member
router.patch("/:memberId/assign-sales", ...receptionAccess, assignSalesman);

//patch  Freeze a member
router.patch("/:memberId/freeze", ...receptionAccess, freezeMember);

module.exports = router;