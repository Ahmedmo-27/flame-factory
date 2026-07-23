const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const validate = require("../middleware/validate");
const {
    createWhatsAppTemplateSchema,
    updateWhatsAppTemplateSchema,
} = require("../validation/schemas");
const {
    createTemplate,
    getTemplates,
    updateTemplate,
    deleteTemplate,
} = require("../controllers/whatsappTemplateController");

router.get("/", protect, getTemplates);

router.post(
    "/",
    protect,
    authorize("Owner", "Sales Manager", "Accountant"),
    validate(createWhatsAppTemplateSchema),
    createTemplate
);
router.patch(
    "/:id",
    protect,
    authorize("Owner", "Sales Manager", "Accountant"),
    validate(updateWhatsAppTemplateSchema),
    updateTemplate
);
router.delete(
    "/:id",
    protect,
    authorize("Owner", "Sales Manager", "Accountant"),
    deleteTemplate
);

module.exports = router;
