const mongoose = require("mongoose");
const noteSchema = new mongoose.Schema({
    text:{
        type: String,
        required: true
    },

    createdBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    }
},
{timestamp:true}

);

const logSchema = new mongoose.Schema({
    text:{
        type: Date,
        required: true
    },

    createdBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    }
},
{timestamp:true}

);

const freezeSchema = new mongoose.Schema({
  startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true,
        validate: {
            validator: function(value) {
                return value > this.startDate;
            },
            message: 'End date must be after start date'
        }},

    createdBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    }
},
{timestamp:true}

);




const memberSchema = new mongoose.Schema({
    memberId: {
        type: Number,
        unique: true,
        sparse: true,
    },

    name: {
        type: String,
        required: true,
        trim: true
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
        enum:["male", "female"],
        default: null
    },

    bitthdate:{
        type: Date,
        default: null
    },

    status: {
        type: String,
        enum:["active","frozen","expired"],
        default: "active"
    },

    createdBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    Type:{
        type: String,
        enum:["Social media","Walk in","Word of mouth","referal","sales call","data entry","others"],
        default: null
    },

    salesRep: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },

    package:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"Package",
        required:true
    },

    notes:[noteSchema],

    freeze:[freezeSchema],

    userlog:[logSchema]

},


    {timestamps: true}

);

module.exports = mongoose.model("Member", memberSchema);