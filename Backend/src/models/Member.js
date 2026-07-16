const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

const alertSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    active: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

const logSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["check-in", "pt-session", "note", "renewal", "freeze", "assign", "other"],
        default: "other"
    },
    text: {
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

const freezeSchema = new mongoose.Schema({
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    note: {
        type: String,
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    endedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    }
}, { timestamps: true });

const invitationSchema = new mongoose.Schema({
    invitedName: {
        type: String,
        required: true
    },
    invitedPhone: {
        type: String,
        default: null
    },
    idFile: {
        type: String,   // stored file path / URL
        default: null
    },
    usedAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

const subscriptionSchema = new mongoose.Schema({
    subscriptionId: {
        type: Number
        // auto-generated starting from 100, increments globally
    },
    package: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Package",
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    pricePaid: {
        type: Number,
        required: true
    },
    discountPercent: {
        type: Number,
        default: 0
    },
    isRenewal: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    salesManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    }
}, { timestamps: true });

const memberSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true
    },

    // Given to everyone added to the system (guests + members). Used for search.
    systemId: {
        type: Number,
        unique: true,
        sparse: true
    },

    // Given only when a person subscribes. Used for check-in and search.
    memberId: {
        type: Number,
        unique: true,
        sparse: true,
    },

    // true = has an active or past subscription, false = guest only
    isMember: {
        type: Boolean,
        default: false
    },

    phones: {
        type: String,
        required: true
    },

    nationalId: {
        type: String,   
        default: null
    },

    photo: {
        type: String,
        default: null
    },

    gender: {
        type: String,
        enum: ["male", "female"],
        default: null
    },

    birthdate: {
        type: Date,
        default: null
    },

    // guest = not subscribed yet, active/frozen/expired = member
    status: {
        type: String,
        enum: ["guest", "active", "frozen", "expired"],
        default: "guest"
    },

    source: {
        type: String,
        enum: ["Social media", "Walk in", "Word of mouth", "referral", "sales call", "data entry", "others"],
        default: null
    },

    assignedSales: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    // Current active package is read from subscriptions[last].package — not stored separately

    // Full subscription history (each renewal creates a new entry)
    subscriptions: [subscriptionSchema],

    // Freeze days consumed in current subscription
    freezeDaysUsed: {
        type: Number,
        default: 0
    },

    // Invitations consumed in current subscription
    invitationsUsed: {
        type: Number,
        default: 0
    },

    isBlocked: {
    type: Boolean,
    default: false
},
blockedReason: {
    type: String,
    default: null
},
blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
},
blockedAt: {
    type: Date,
    default: null
},


    // Current couch assigned to the member
    current_couch:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },

    // Couch subscription status
    couch_subscription_status: {
        type: String,
        enum: ["active", "transferred", "expired","interested","not interested"],
        default: null
    },
    
    PT_sessions:{
        type: Number,
        default:0
    },

    used_PT_sessions:{
        type: Number,
        default:0
    },

    PT_sessions_expDate:{
        type: Date,
    },

    PT_sessions_startDate:{
        type: Date,
    },

    pt_subscriptions: [{
        sessions: { type: Number, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        durationMonths: { type: Number, required: true },
        pricePaid: { type: Number, default: 0 },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now },
    }],

    notes:       [noteSchema],
    alert:       [alertSchema],
    couch_notes: [noteSchema],
    freeze:      [freezeSchema],
    invitations: [invitationSchema],
    userlog:     [logSchema]

}, { timestamps: true });

// ── Indexes for performance ───────────────────────────────────────────────────
memberSchema.index({ status: 1, systemId: 1 });
memberSchema.index({ assignedSales: 1, status: 1 });
memberSchema.index({ current_couch: 1 });
memberSchema.index({ isBlocked: 1 });
memberSchema.index({ name: 1 });
memberSchema.index({ phones: 1 });

module.exports = mongoose.model("Member", memberSchema);