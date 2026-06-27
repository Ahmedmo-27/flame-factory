const Member = require("../models/Member");

// Get all members
const getMembers = async (req, res) => {
    try {
        const members = await Member.find()
            .populate("salesRep", "name email")
            .populate("package", "name price");
        
        // Filter phones for sales role
        if (req.user.role === "Sales") {
            const filteredMembers = members.map(member => {
                const memberObj = member.toObject();
                if (!memberObj.salesRep || memberObj.salesRep._id.toString() !== req.user.id) {
                    memberObj.phones = null;
                }
                return memberObj;
            });
            return res.json(filteredMembers);
        }

        res.json(members);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get single member
const getMemberById = async (req, res) => {
    try {
        const member = await Member.findById(req.params.id)
            .populate("salesRep", "name email")
            .populate("package", "name price");
        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        const memberObj = member.toObject();
        if (req.user.role === "Sales") {
            if (!memberObj.salesRep || memberObj.salesRep._id.toString() !== req.user.id) {
                memberObj.phones = null;
            }
        }

        res.json(memberObj);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Add note to member
const addNote = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ message: "Note text is required" });
        }

        const member = await Member.findById(req.params.id);
        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        member.notes.push({
            text,
            createdBy: req.user.id
        });

        await member.save();
        res.status(201).json({ message: "Note added successfully", member });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Switch sales rep
const switchSalesRep = async (req, res) => {
    try {
        const { newSalesRepId } = req.body;
        if (!newSalesRepId) {
            return res.status(400).json({ message: "New Sales Rep ID is required" });
        }

        const member = await Member.findById(req.params.id);
        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        member.salesRep = newSalesRepId;
        await member.save();

        res.json({ message: "Sales representative updated successfully", member });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    getMembers,
    getMemberById,
    addNote,
    switchSalesRep
};
