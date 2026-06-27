const mongoose = require("mongoose");
const packageSchema = new mongoose.Schema({

    name: { 
        type: String,
        required: true,
        trim: true
    },

    type:{
        type: String,
        required:true
    },
    
    price:{
        type: Number,
        required:true
    },
    
    durationMonths:{
        type: Number,
        required: true
    },

    sessionsLimit:{
        type:Number,
        default: null
    },

    freezeLimitDays:{
        type: Number,
        default:0
    },

    hasCoach: {
        type:Boolean,
        default: false
    },

    isActive:{
        type:Boolean,
        default: true
    },

    createdBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
        required: true
    }

},
    {timestamps:true}
);
module.exports = mongoose.model("Package", packageSchema);