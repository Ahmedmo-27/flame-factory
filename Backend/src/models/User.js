const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({

    name: String,

    email: {
        type: String,
        unique: true
    },

    username: String,
    mobile_number:String,
    password: String,

    role: {
        type: String,
        enum: ["Owner", "Receptionist", "Coach","Coach Manager", "Accountant", "Sales", "Sales Manager"],
        default: "Receptionist"
    },

    monthlyTarget: {
        type: Number,
        default: 0
    },

    abilities: {
        canCommentOnMembers: { type: Boolean, default: true },
        canRequestAssignment: { type: Boolean, default: true },
        canRequestTakeover: { type: Boolean, default: true },
    }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema)