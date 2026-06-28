const express = require("express");
const router = express.Router();
const {
    getMembers,
    getMemberById,
    addNote,
    switchSalesRep
} = require("../controllers/memberController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(protect);

// Sales and Sales Manager can view members
router.get("/", authorizeRoles("Sales", "Sales Manager", "Owner"), getMembers);
router.get("/:id", authorizeRoles("Sales", "Sales Manager", "Owner"), getMemberById);

// Sales and Sales Manager can add notes
router.post("/:id/notes", authorizeRoles("Sales", "Sales Manager", "Owner"), addNote);

// Only Sales Manager (and owner) can switch sales reps
router.put("/:id/sales-rep", authorizeRoles("Sales Manager", "Owner"), switchSalesRep);

module.exports = router;
