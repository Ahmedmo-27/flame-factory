const express = require("express");
const router  = express.Router();
const {
    createRequest,
    updateRequestStatus,
    getRequests
} = require("../controllers/salesRequestController");
const protect   = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

// All routes require authentication
router.use(protect);

// Sales sees own requests; Sales Manager/Owner sees all
router.get("/",           authorize("Sales", "Sales Manager", "Owner"), getRequests);

// Sales creates a reassignment request
router.post("/",          authorize("Sales"),                           createRequest);

// Sales Manager / Owner approves or rejects
router.put("/:id/status", authorize("Sales Manager", "Owner"),          updateRequestStatus);

module.exports = router;
