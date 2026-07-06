const mongoose = require("mongoose");

const packageExceptionRequestSchema = new mongoose.Schema({
    member: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Member",
        required: true
    },
    basePackage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Package",
        required: true
    },
    proposedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending"
    },
    hasException: {
        type: Boolean,
        default: true
    },

    // Proposed package terms (override catalog defaults)
    name: { type: String, required: true },
    activityType: {
        type: String,
        enum: ["gym", "crossfit", "box", "mma", "kickboxing", "calisthenics"],
        required: true
    },
    duration: {
        type: String,
        enum: ["1 month", "3 months", "6 months", "1 year"],
        required: true
    },
    price: { type: Number, required: true },
    freezeLimitDays: { type: Number, default: 0 },
    invitationLimit: { type: Number, default: 0 },
    renewalDiscountPercent: { type: Number, default: 0, min: 0, max: 100 },
    description: { type: String, default: null },

    // Subscription terms
    pricePaid: { type: Number, required: true },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    startDate: { type: Date, default: () => new Date() },

    reason: { type: String, default: null },

    notificationMessage: { type: String, default: null },

    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    reviewNote: { type: String, default: null }
}, { timestamps: true });

packageExceptionRequestSchema.index({ member: 1, status: 1 });

module.exports = mongoose.model("PackageExceptionRequest", packageExceptionRequestSchema);
