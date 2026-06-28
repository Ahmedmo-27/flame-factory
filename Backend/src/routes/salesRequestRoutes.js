const express = require("express");
const router = express.Router();
const {
    createRequest,
    updateRequestStatus,
    getRequests
} = require("../controllers/salesRequestController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.use(protect);

// Get requests (Sales sees own, Sales Manager sees all)
router.get("/", authorizeRoles("Sales", "Sales Manager", "Owner"), getRequests);

// Sales rep creates a request to take over a member
router.post("/", authorizeRoles("Sales"), createRequest);

// Sales manager accepts/rejects a request
router.put("/:id/status", authorizeRoles("Sales Manager", "Owner"), updateRequestStatus);

module.exports = router;
