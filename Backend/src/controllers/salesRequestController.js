const SalesRepRequest = require("../models/SalesRepRequest");
const Member = require("../models/Member");

// Submit a request to assign a member to the logged-in sales rep
const createRequest = async (req, res) => {
    try {
        const { memberId } = req.body;
        if (!memberId) {
            return res.status(400).json({ message: "Member ID is required" });
        }

        const member = await Member.findById(memberId);
        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        // Check if there is already a pending request
        const existingRequest = await SalesRepRequest.findOne({ member: memberId, status: "pending" });
        if (existingRequest) {
            return res.status(400).json({ message: "There is already a pending request for this member" });
        }

        const newRequest = await SalesRepRequest.create({
            member: memberId,
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
                member.salesRep = request.requestedBy;
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
