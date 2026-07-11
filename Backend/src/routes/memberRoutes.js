/**
 * DEPRECATED — not mounted in app.js.
 * Active member routes live in membersRoutes.js (/api/members).
 * Kept only to avoid breaking accidental imports; do not add new endpoints here.
 */
const express = require("express");
const router = express.Router();
const {
    getMembers,
    getMemberById,
    addNote,
    switchSalesRep
} = require("../controllers/memberController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", authorizeRoles("Sales", "Sales Manager", "Owner"), getMembers);
router.get("/:id", authorizeRoles("Sales", "Sales Manager", "Owner"), getMemberById);
router.post("/:id/notes", authorizeRoles("Sales", "Sales Manager", "Owner"), addNote);
router.put("/:id/sales-rep", authorizeRoles("Sales Manager", "Owner"), switchSalesRep);

module.exports = router;
