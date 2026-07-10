const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true
    },

    activityType: {
        type: String,
        enum: ["gym", "crossfit", "box", "mma", "kickboxing", "calisthenics"],
        default: "gym"
    },

    duration: {
        type: String,
        enum: ["1 month", "3 months", "6 months", "1 year"],
        required: true
    },

    price: {
        type: Number,
        required: true
    },

    // Max days a member on this package is allowed to freeze per subscription
    freezeLimitDays: {
        type: Number,
        default: 0
    },

    // How many invitation slots a member on this package gets
    invitationLimit: {
        type: Number,
        default: 0
    },

    // Discount % auto-applied on renewal (e.g. 15 for 15%)
    renewalDiscountPercent: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    description: {
        type: String,
        default: null
    },

    isActive: {
        type: Boolean,
        default: true
    },

    createdBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
        required: true
    },

    free_pt_sessions: {
        type: Number,
        default: 0
    }

},
    {timestamps:true}
);
module.exports = mongoose.model("Package", packageSchema);