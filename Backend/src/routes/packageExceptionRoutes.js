const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
    createException,
    updateExceptionStatus,
    getExceptions,
    getMemberPendingException,
} = require("../controllers/packageExceptionController");

router.use(protect);

router.get("/", authorize("Sales Manager", "Owner", "Accountant"), getExceptions);
router.get("/member/:memberId", authorize("Sales Manager", "Owner", "Accountant", "Receptionist"), getMemberPendingException);
router.post("/", authorize("Sales Manager"), createException);
router.put("/:id/status", authorize("Accountant", "Owner"), updateExceptionStatus);

module.exports = router;
