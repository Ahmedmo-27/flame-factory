const PackageExceptionRequest = require("../models/PackageExceptionRequest");
const Package = require("../models/Package");
const Member = require("../models/Member");
const User = require("../models/User");
const { findMemberByIdentifier } = require("../utils/memberLookup");
const {
    notifyPackageExceptionPending,
    notifyPackageExceptionResolved,
} = require("../utils/notificationService");

const calcEndDate = (startDate, duration) => {
    const end = new Date(startDate);
    switch (duration) {
        case "1 month":  end.setMonth(end.getMonth() + 1); break;
        case "3 months": end.setMonth(end.getMonth() + 3); break;
        case "6 months": end.setMonth(end.getMonth() + 6); break;
        case "1 year":   end.setFullYear(end.getFullYear() + 1); break;
    }
    return end;
};

const generateMemberId = async () => {
    const last = await Member.findOne(
        { memberId: { $ne: null } },
        { memberId: 1 }
    ).sort({ memberId: -1 });
    if (!last || !last.memberId) return 100;
    return last.memberId + 1;
};

const generateSubscriptionId = async () => {
    const result = await Member.aggregate([
        { $unwind: "$subscriptions" },
        { $group: { _id: null, maxId: { $max: "$subscriptions.subscriptionId" } } }
    ]);
    if (!result.length || result[0].maxId == null) return 100;
    return result[0].maxId + 1;
};

const buildExceptionPackage = async (request, memberId, userId) => {
    return Package.create({
        name: request.name,
        activityType: request.activityType,
        duration: request.duration,
        price: request.price,
        freezeLimitDays: request.freezeLimitDays,
        invitationLimit: request.invitationLimit,
        renewalDiscountPercent: request.renewalDiscountPercent,
        description: request.description,
        isActive: true,
        hasException: true,
        basedOn: request.basePackage,
        forMember: memberId,
        createdBy: userId,
    });
};

const applyApprovedException = async (request, reviewerId) => {
    const member = await Member.findById(request.member);
    if (!member) throw new Error("Member not found");

    let packageId;
    let packageName;

    if (request.hasException) {
        const exceptionPkg = await buildExceptionPackage(
            request,
            member._id,
            request.proposedBy
        );
        packageId = exceptionPkg._id;
        packageName = exceptionPkg.name;
    } else {
        packageId = request.basePackage;
        const basePkg = await Package.findById(request.basePackage);
        packageName = basePkg?.name ?? request.name;
    }

    const startDate = request.startDate ? new Date(request.startDate) : new Date();
    const endDate = calcEndDate(startDate, request.duration);
    const subscriptionId = await generateSubscriptionId();
    const hadSubscription = member.subscriptions?.length > 0;

    const subscription = {
        subscriptionId,
        package: packageId,
        startDate,
        endDate,
        pricePaid: request.pricePaid,
        discountPercent: request.discountPercent ?? 0,
        isRenewal: hadSubscription,
        createdBy: request.proposedBy,
    };

    if (!member.memberId) {
        member.memberId = await generateMemberId();
    }

    member.isMember = true;
    member.status = "active";
    member.subscriptions.push(subscription);
    member.freezeDaysUsed = 0;
    member.invitationsUsed = 0;
    member.userlog.push({
        type: hadSubscription ? "renewal" : "other",
        text: request.hasException
            ? `Package exception approved by accountant (${packageName})`
            : `Package request approved by accountant (${packageName})`,
        createdBy: reviewerId,
    });

    await member.save();
    return member;
};

// Sales Manager proposes a package exception for a member
const createException = async (req, res) => {
    try {
        const {
            memberId,
            basePackageId,
            name,
            activityType,
            duration,
            price,
            freezeLimitDays,
            invitationLimit,
            renewalDiscountPercent,
            description,
            pricePaid,
            discountPercent,
            startDate,
            reason,
        } = req.body;

        if (!memberId || !basePackageId) {
            return res.status(400).json({ message: "Member ID and base package are required" });
        }

        const member = await findMemberByIdentifier(memberId);
        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        const basePkg = await Package.findById(basePackageId);
        if (!basePkg || !basePkg.isActive || basePkg.hasException) {
            return res.status(400).json({ message: "Base package not found or unavailable" });
        }

        const existing = await PackageExceptionRequest.findOne({
            member: member._id,
            status: "pending",
        });
        if (existing) {
            return res.status(400).json({ message: "This member already has a pending package exception" });
        }

        const proposer = await User.findById(req.user.id).select("name");
        const packageName = name ?? basePkg.name;
        const isException = Boolean(req.body.hasException);
        const notificationMessage = isException
            ? `${proposer?.name || "Sales Manager"} added package ${packageName} with exception to member ${member.name}`
            : `${proposer?.name || "Sales Manager"} requested package ${packageName} for member ${member.name}`;

        const request = await PackageExceptionRequest.create({
            member: member._id,
            basePackage: basePkg._id,
            proposedBy: req.user.id,
            hasException: isException,
            name: name ?? basePkg.name,
            activityType: activityType ?? basePkg.activityType,
            duration: duration ?? basePkg.duration,
            price: price ?? basePkg.price,
            freezeLimitDays: freezeLimitDays ?? basePkg.freezeLimitDays,
            invitationLimit: invitationLimit ?? basePkg.invitationLimit,
            renewalDiscountPercent: renewalDiscountPercent ?? basePkg.renewalDiscountPercent,
            description: description ?? basePkg.description,
            pricePaid: pricePaid ?? price ?? basePkg.price,
            discountPercent: discountPercent ?? 0,
            startDate: startDate ? new Date(startDate) : new Date(),
            reason: reason ?? null,
            notificationMessage,
        });

        const accountants = await User.find({ role: "Accountant" }).select("_id");
        await Promise.all(
            accountants.map((acct) =>
                notifyPackageExceptionPending({
                    recipientId: acct._id,
                    member,
                    actorId: req.user.id,
                    requestId: request._id,
                    salesManagerName: proposer?.name,
                    packageName,
                })
            )
        );

        const populated = await PackageExceptionRequest.findById(request._id)
            .populate("member", "name systemId memberId")
            .populate("basePackage", "name duration price")
            .populate("proposedBy", "name email");

        res.status(201).json({ message: "Package exception submitted for approval", request: populated });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Accountant approves or rejects
const updateExceptionStatus = async (req, res) => {
    try {
        const { status, reviewNote } = req.body;
        if (!["accepted", "rejected"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const request = await PackageExceptionRequest.findById(req.params.id)
            .populate("member", "name");
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (request.status !== "pending") {
            return res.status(400).json({ message: "Request has already been processed" });
        }

        request.status = status;
        request.reviewedBy = req.user.id;
        request.reviewNote = reviewNote ?? null;
        await request.save();

        if (status === "accepted") {
            await applyApprovedException(request, req.user.id);
        }

        await notifyPackageExceptionResolved({
            recipientId: request.proposedBy,
            member: request.member,
            actorId: req.user.id,
            status,
            requestId: request._id,
        });

        res.json({ message: `Package exception ${status}`, request });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// List exceptions — Sales Manager sees own; Accountant/Owner see all pending
const getExceptions = async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === "Sales Manager") {
            filter.proposedBy = req.user.id;
        }

        const requests = await PackageExceptionRequest.find(filter)
            .populate("member", "name systemId memberId status")
            .populate("basePackage", "name duration price activityType")
            .populate("proposedBy", "name email")
            .populate("reviewedBy", "name")
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Pending exception for a specific member (shown on profile Packages tab)
const getMemberPendingException = async (req, res) => {
    try {
        const member = await findMemberByIdentifier(req.params.memberId);
        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        const request = await PackageExceptionRequest.findOne({
            member: member._id,
            status: "pending",
        })
            .populate("basePackage", "name duration price activityType freezeLimitDays invitationLimit renewalDiscountPercent")
            .populate("proposedBy", "name");

        res.json({ request: request ?? null });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    createException,
    updateExceptionStatus,
    getExceptions,
    getMemberPendingException,
};
