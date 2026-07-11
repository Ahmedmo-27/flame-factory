const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const validate = require("../middleware/validate");
const {
    salesRequestSchema,
    salesRequestStatusSchema,
} = require("../validation/schemas");
const {
    createRequest,
    updateRequestStatus,
    getRequests
} = require("../controllers/salesRequestController");

// Identical auth on /api/sales-requests and /api/requests (both mount this router)
router.use(protect);

router.get("/",           authorize("Sales", "Sales Manager", "Owner"), getRequests);
router.post("/",          authorize("Sales"), validate(salesRequestSchema), createRequest);
router.put("/:id/status", authorize("Sales Manager", "Owner"), validate(salesRequestStatusSchema), updateRequestStatus);

module.exports = router;
