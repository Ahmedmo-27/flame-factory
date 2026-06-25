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
        type: mongoose.Aggregate.Schema.Types.ObjectID,
        ref:"User",
        required: true
    }

},
    {timestamp:true}
);
module.exports = mongoose.model("package", packageSchema);