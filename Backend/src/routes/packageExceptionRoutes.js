const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const validate = require("../middleware/validate");
const {
    createExceptionSchema,
    exceptionStatusSchema,
} = require("../validation/schemas");
const {
    createException,
    updateExceptionStatus,
    getExceptions,
    getMemberPendingException,
} = require("../controllers/packageExceptionController");

router.use(protect);

router.get("/", authorize("Accountant"), getExceptions);
router.get("/member/:memberId", authorize("Sales Manager", "Owner", "Accountant", "Receptionist"), getMemberPendingException);
router.post("/", authorize("Sales Manager"), validate(createExceptionSchema), createException);
router.put("/:id/status", authorize("Accountant"), validate(exceptionStatusSchema), updateExceptionStatus);

module.exports = router;
