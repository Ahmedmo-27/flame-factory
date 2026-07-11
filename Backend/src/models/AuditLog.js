const mongoose = require("mongoose");

/**
 * Durable audit trail for sensitive mutations (exceptions, freezes, package assign, staff).
 * ProfileView remains the dedicated trail for profile reads.
 */
const auditLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: [
            "package_exception_created",
            "package_exception_accepted",
            "package_exception_rejected",
            "package_assigned",
            "member_frozen",
            "member_created",
            "staff_created",
            "sales_abilities_updated",
            "upload_accessed",
        ],
    },
    actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    actorRole: { type: String, default: null },
    targetType: {
        type: String,
        enum: ["member", "user", "package_exception", "upload", "other"],
        default: "other",
    },
    targetId: { type: String, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null },
    requestId: { type: String, default: null },
}, { timestamps: true });

auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetId: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
