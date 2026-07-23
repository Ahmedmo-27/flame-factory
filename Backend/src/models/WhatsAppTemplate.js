const mongoose = require("mongoose");

const whatsAppTemplateSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        // Builtin: "packages" | "discounts"; any other string is a custom free-text type
        type: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },

        introText: {
            type: String,
            default: "",
            trim: true,
        },

        bodyText: {
            type: String,
            default: "",
            trim: true,
        },

        // For packages/discounts: append live catalog / renewal discount lines
        includeLiveData: {
            type: Boolean,
            default: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("WhatsAppTemplate", whatsAppTemplateSchema);
