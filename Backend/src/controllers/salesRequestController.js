const SalesRepRequest = require("../models/SalesRepRequest");
const Member = require("../models/Member");
const User = require("../models/User");
const { resolveAbilities } = require("../utils/userAbilities");
const { buildMemberFilter, findMemberByIdentifier } = require("../utils/memberLookup");

// Submit a request to assign a member to the logged-in sales rep
const createRequest = async (req, res) => {
    try {
        const { memberId } = req.body;
        if (!memberId) {
            return res.status(400).json({ message: "Member ID is required" });
        }

        const member = await findMemberByIdentifier(memberId);
        if (!member) {
            const filter = buildMemberFilter(memberId);
            if (!filter) {
                return res.status(400).json({ message: "Invalid member ID" });
            }
            return res.status(404).json({ message: "Member not found" });
        }

        const resolvedMemberId = member._id;

        const salesUser = await User.findById(req.user.id);
        const abilities = resolveAbilities(salesUser);
        const isTakeover = Boolean(member.assignedSales);

        if (isTakeover && !abilities.canRequestTakeover) {
            return res.status(403).json({ message: "You are not allowed to request replacing another representative" });
        }

        if (!isTakeover && !abilities.canRequestAssignment) {
            return res.status(403).json({ message: "You are not allowed to request acquiring new members" });
        }

        // Prevent requesting members already assigned to the requester
        if (member.assignedSales && member.assignedSales.toString() === req.user.id) {
            return res.status(400).json({ message: "This member is already assigned to you" });
        }

        // Check if there is already a pending request
        const existingRequest = await SalesRepRequest.findOne({ member: resolvedMemberId, status: "pending" });
        if (existingRequest) {
            return res.status(400).json({ message: "There is already a pending request for this member" });
        }

        const newRequest = await SalesRepRequest.create({
            member: resolvedMemberId,
            requestedBy: req.user.id,
            status: "pending"
        });

        res.status(201).json({ message: "Request submitted successfully", request: newRequest });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update request status (Approve/Reject)
const updateRequestStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!["accepted", "rejected"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const request = await SalesRepRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (request.status !== "pending") {
            return res.status(400).json({ message: "Request has already been processed" });
        }

        request.status = status;
        await request.save();

        if (status === "accepted") {
            // Update the member's salesRep to the requester
            const member = await Member.findById(request.member);
            if (member) {
                member.assignedSales = request.requestedBy;
                await member.save();
            }
        }

        res.json({ message: `Request ${status} successfully`, request });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get requests
const getRequests = async (req, res) => {
    try {
        let filter = {};
        
        // If the user is a sales rep, only show their own requests
        if (req.user.role === "Sales") {
            filter.requestedBy = req.user.id;
        }

        const requests = await SalesRepRequest.find(filter)
            .populate("member", "name")
            .populate("requestedBy", "name email");

        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    createRequest,
    updateRequestStatus,
    getRequests
};
