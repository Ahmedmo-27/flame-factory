const Member = require("../models/Member");
const User = require("../models/User");
require("../models/Package");
const { resolveAbilities } = require("../utils/userAbilities");
const { buildMemberFilter, findMemberByIdentifier } = require("../utils/memberLookup");

const memberPopulate = [
    { path: "salesRep", select: "name email" },
    { path: "package", select: "name price" },
];

function isAssignedToRep(memberObj, userId) {
    return Boolean(
        memberObj.salesRep &&
        memberObj.salesRep._id.toString() === userId.toString()
    );
}

function sanitizeMemberForSalesRep(memberObj, userId) {
    const sanitized = { ...memberObj };
    sanitized.isAssignedToMe = isAssignedToRep(sanitized, userId);
    if (!sanitized.isAssignedToMe) {
        sanitized.phones = null;
    }
    return sanitized;
}

const memberQuery = () =>
    Member.find()
        .populate("salesRep", "name email")
        .populate("package", "name price");

// Get all members
const getMembers = async (req, res) => {
    try {
        if (req.user.role === "Sales") {
            const members = await Member.find({ salesRep: req.user.id })
                .populate("salesRep", "name email")
                .populate("package", "name price");

            const result = members.map((member) => {
                const memberObj = member.toObject();
                memberObj.isAssignedToMe = true;
                return memberObj;
            });
            return res.json(result);
        }

        const members = await memberQuery();
        res.json(members);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get single member (sales reps may look up any member by id or memberId)
const getMemberById = async (req, res) => {
    try {
        const filter = buildMemberFilter(req.params.id);
        if (!filter) {
            return res.status(400).json({ message: "Invalid member ID" });
        }

        const member = await Member.findOne(filter).populate(memberPopulate);
        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        const memberObj = member.toObject();
        if (req.user.role === "Sales") {
            return res.json(sanitizeMemberForSalesRep(memberObj, req.user.id));
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

        if (req.user.role === "Sales") {
            const salesUser = await User.findById(req.user.id);
            const abilities = resolveAbilities(salesUser);
            if (!abilities.canCommentOnMembers) {
                return res.status(403).json({ message: "You are not allowed to comment on members" });
            }
        }

        const member = await findMemberByIdentifier(req.params.id);
        if (!member) {
            const filter = buildMemberFilter(req.params.id);
            if (!filter) {
                return res.status(400).json({ message: "Invalid member ID" });
            }
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

        const member = await findMemberByIdentifier(req.params.id);
        if (!member) {
            const filter = buildMemberFilter(req.params.id);
            if (!filter) {
                return res.status(400).json({ message: "Invalid member ID" });
            }
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
