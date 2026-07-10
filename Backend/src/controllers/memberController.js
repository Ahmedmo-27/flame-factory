const Member = require("../models/Member");
const Package = require("../models/Package");
const User = require("../models/User");
const ProfileView = require("../models/ProfileView");
const { resolveAbilities } = require("../utils/userAbilities");
const { attachCurrentPackage } = require("../utils/revenueUtils");
const { findMemberByIdentifier, buildMemberFilter } = require("../utils/memberLookup");
const { notifyMemberAssigned } = require("../utils/notificationService");
const { parsePagination, buildPagination } = require("../utils/pagination");
const { buildMemberListFilter, getMemberStatusStats } = require("../utils/memberFilters");

// ─── Helper: get current package from last subscription ───────────────────────
const getCurrentPackage = (member) => {
    if (!member.subscriptions || !member.subscriptions.length) return null;
    return member.subscriptions[member.subscriptions.length - 1].package;
};

// ─── Helper: validate sales assignee ─────────────────────────────────────────
const validateSalesAssignee = async (salesId) => {
    const salesUser = await User.findById(salesId);
    if (!salesUser || !["Sales", "Sales Manager"].includes(salesUser.role)) {
        return null;
    }
    return salesUser;
};

// ─── Helper: generate next systemId (everyone, starts at 100) ────────────────
const generateSystemId = async () => {
    const last = await Member.findOne({}, { systemId: 1 }).sort({ systemId: -1 });
    if (!last || !last.systemId) return 100;
    return last.systemId + 1;
};

// ─── Helper: generate next memberId (subscribers only, starts at 100) ────────
const generateMemberId = async () => {
    const last = await Member.findOne(
        { memberId: { $ne: null } },
        { memberId: 1 }
    ).sort({ memberId: -1 });
    if (!last || !last.memberId) return 100;
    return last.memberId + 1;
};

// ─── Helper: generate next subscriptionId (global counter, starts at 100) ────
const generateSubscriptionId = async () => {
    const result = await Member.aggregate([
        { $unwind: "$subscriptions" },
        { $group: { _id: null, maxId: { $max: "$subscriptions.subscriptionId" } } }
    ]);
    if (!result.length || result[0].maxId == null) return 100;
    return result[0].maxId + 1;
};

// ─── Helper: calculate subscription end date ─────────────────────────────────
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

// ─── Helper: find by systemId, memberId, or MongoDB _id ──────────────────────
const findMember = async (id) => {
    const query = buildMemberFilter(id);
    if (!query) return null;
    return Member.findOne(query).populate("subscriptions.package");
};

// ─── 1. Add Person (guest or member) ─────────────────────────────────────────
const createMember = async (req, res) => {
    try {
        const {
            name, phones, photo,
            gender, birthdate, source,
            packageId, assignedSales
        } = req.body;

        const systemId = await generateSystemId();

        const personData = {
            systemId,
            name,
            phones,
            photo:         photo         || null,
            gender:        gender        || null,
            birthdate:     birthdate     || null,
            source:        source        || null,
            assignedSales: assignedSales || null,
            createdBy:     req.user.id
        };

        if (packageId) {
            const pkg = await Package.findById(packageId);
            if (!pkg || !pkg.isActive) {
                return res.status(400).json({ message: "Package not found or inactive" });
            }

            const startDate      = new Date();
            const endDate        = calcEndDate(startDate, pkg.duration);
            const memberId       = await generateMemberId();
            const subscriptionId = await generateSubscriptionId();

            Object.assign(personData, {
                memberId,
                isMember: true,
                status:   "active",
                subscriptions: [{
                    subscriptionId,
                    package:         pkg._id,
                    startDate,
                    endDate,
                    pricePaid:       pkg.price,
                    discountPercent: 0,
                    isRenewal:       false,
                    createdBy:       req.user.id
                }]
            });
        } else {
            personData.status   = "guest";
            personData.isMember = false;
        }

        const member = await Member.create(personData);

        if (personData.assignedSales) {
            await notifyMemberAssigned({
                recipientId: personData.assignedSales,
                member,
                actorId: req.user.id,
            });
        }

        res.status(201).json({ message: packageId ? "Member created" : "Guest added", member });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── 2. Get All Members ───────────────────────────────────────────────────────
const getAllMembers = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const filter = buildMemberListFilter({
            status: req.query.status,
            search: req.query.search,
            assignedSales: req.query.assignedSales,
            unassigned: req.query.unassigned,
            subscribedToday: req.query.subscribedToday,
        });

        const statsFilter = { ...filter };
        delete statsFilter["subscriptions.createdAt"];

        const [total, members, stats] = await Promise.all([
            Member.countDocuments(filter),
            Member.find(filter)
                .populate("subscriptions.package", "name duration activityType")
                .populate("createdBy", "name")
                .populate("assignedSales", "name role")
                .sort({ systemId: 1 })
                .skip(skip)
                .limit(limit),
            getMemberStatusStats(Member, statsFilter),
        ]);

        res.status(200).json({
            count: total,
            members,
            pagination: buildPagination(page, limit, total),
            stats,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── 3. Get Member Profile ────────────────────────────────────────────────────
const getMemberProfile = async (req, res) => {
    try {
        const { memberId } = req.params;
        const query = buildMemberFilter(memberId);
        if (!query) {
            return res.status(400).json({ message: "Invalid member ID" });
        }

        const member = await Member.findOne(query)
            .populate("subscriptions.package", "name duration activityType price freezeLimitDays invitationLimit renewalDiscountPercent hasException")
            .populate("subscriptions.createdBy", "name")
            .populate("subscriptions.approvedBy", "name email role")
            .populate("subscriptions.salesManager", "name email role")
            .populate("createdBy", "name role")
            .populate("assignedSales", "name role")
            .populate("notes.createdBy", "name")
            .populate("alert.createdBy", "name role")
            .populate("freeze.createdBy", "name")
            .populate("freeze.endedBy", "name")
            .populate("invitations.createdBy", "name")
            .populate("userlog.createdBy", "name");

        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        const currentPkg = getCurrentPackage(member);

        const checkIns = member.userlog
            .filter(log => log.type === "check-in")
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Log this profile view
        await ProfileView.create({ member: member._id, viewedBy: req.user.id });

        const profileViews = await ProfileView.find({ member: member._id })
            .populate("viewedBy", "name role")
            .sort({ createdAt: -1 });

        const memberPayload = member.toObject();
        if (req.user.role === "Sales" && !isAssignedToRep(memberPayload, req.user.id)) {
            memberPayload.phones = null;
        }

        res.status(200).json({
            member: memberPayload,
            checkIns,
            profileViews,
            stats: {
                totalCheckIns:        checkIns.length,
                totalSubscriptions:   member.subscriptions.length,
                totalFreezes:         member.freeze.length,
                freezeDaysUsed:       member.freezeDaysUsed,
                freezeDaysRemaining:  (currentPkg?.freezeLimitDays || 0) - member.freezeDaysUsed,
                invitationsUsed:      member.invitationsUsed,
                invitationsRemaining: (currentPkg?.invitationLimit || 0) - member.invitationsUsed,
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── 4. Check In Member ───────────────────────────────────────────────────────
const checkInMember = async (req, res) => {
    try {
        const { memberId } = req.params;

        const member = await findMember(memberId);
        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        const activeAlerts = (member.alert || []).filter(a => a.active);

        if (member.status === "expired") {
            return res.status(400).json({ message: "Cannot check in — membership expired" });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // If frozen — end the freeze early and extend subscription
        if (member.status === "frozen") {
            const activeFreeze = member.freeze
                .slice().reverse()
                .find(f => new Date(f.endDate) > today);

            if (activeFreeze) {
                const freezeStart      = new Date(activeFreeze.startDate);
                freezeStart.setHours(0, 0, 0, 0);
                const originalEnd      = new Date(activeFreeze.endDate);
                const actualFrozenDays = Math.ceil((today - freezeStart) / 86400000);
                const daysSaved        = Math.ceil((originalEnd - today) / 86400000);

                activeFreeze.endDate  = today;
                activeFreeze.endedBy  = req.user.id;

                const previousDays = member.freeze
                    .filter(f => f !== activeFreeze)
                    .reduce((sum, f) => sum + Math.ceil(
                        (new Date(f.endDate) - new Date(f.startDate)) / 86400000
                    ), 0);
                member.freezeDaysUsed = previousDays + actualFrozenDays;

                const currentSub = member.subscriptions[member.subscriptions.length - 1];
                if (currentSub && daysSaved > 0) {
                    const newEnd = new Date(currentSub.endDate);
                    newEnd.setDate(newEnd.getDate() + daysSaved);
                    currentSub.endDate = newEnd;
                }

                member.userlog.push({
                    type:      "other",
                    text:      `Freeze ended early on check-in. Actual freeze: ${actualFrozenDays} day(s). Subscription extended by ${daysSaved} day(s).`,
                    createdBy: req.user.id
                });
            }

            member.status = "active";
        }

        member.userlog.push({
            type:      "check-in",
            text:      "Member checked in",
            createdBy: req.user.id
        });

        await member.save();

        const entry = member.userlog[member.userlog.length - 1];
        res.status(201).json({ message: "Check-in recorded", checkIn: entry, status: member.status });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── 5. Assign Salesman ───────────────────────────────────────────────────────
const assignSalesman = async (req, res) => {
    try {
        const { memberId } = req.params;
        const { salesId } = req.body;

        const salesUser = await validateSalesAssignee(salesId);
        if (!salesUser) {
            return res.status(400).json({
                message: "Invalid salesman — user not found or not a sales role"
            });
        }

        const member = await findMember(memberId);
        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        member.assignedSales = salesId;
        member.userlog.push({
            type: "assign",
            text: `Assigned to ${salesUser.name}`,
            createdBy: req.user.id,
        });
        await member.save();
        await member.populate("assignedSales", "name role");

        await notifyMemberAssigned({
            recipientId: salesId,
            member,
            actorId: req.user.id,
        });

        res.status(200).json({ message: "Salesman assigned", member });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── 6. Freeze Member ─────────────────────────────────────────────────────────
const freezeMember = async (req, res) => {
    try {
        const { memberId } = req.params;
        const { startDate, endDate } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: "startDate and endDate are required" });
        }

        const start = new Date(startDate);
        const end   = new Date(endDate);

        if (end <= start) {
            return res.status(400).json({ message: "endDate must be after startDate" });
        }

        const member = await findMember(memberId);
        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        if (member.status !== "active") {
            return res.status(400).json({
                message: `Cannot freeze — member status is "${member.status}"`
            });
        }

        const currentPkg    = getCurrentPackage(member);
        const allowedDays   = currentPkg?.freezeLimitDays || 0;
        const requestedDays = Math.ceil((end - start) / 86400000);
        const remainingDays = allowedDays - member.freezeDaysUsed;

        if (requestedDays > remainingDays) {
            return res.status(400).json({
                message: `Freeze limit exceeded. Remaining freeze days: ${remainingDays}`
            });
        }

        member.freeze.push({ startDate: start, endDate: end, createdBy: req.user.id });
        member.freezeDaysUsed += requestedDays;

        // Only set status to frozen if the freeze starts today or in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDay = new Date(start);
        startDay.setHours(0, 0, 0, 0);
        if (startDay <= today) {
            member.status = "frozen";
        }
        // If startDate is in the future, status stays "active" until the freeze begins

        await member.save();

        res.status(200).json({
            message:         "Member frozen",
            freezeDaysUsed:  member.freezeDaysUsed,
            freezeLimitDays: allowedDays,
            member
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

function getSalesRepId(memberObj) {
    const rep = memberObj.salesRep || memberObj.assignedSales;
    if (!rep) return null;
    return rep._id ? rep._id.toString() : rep.toString();
}

function isAssignedToRep(memberObj, userId) {
    const repId = getSalesRepId(memberObj);
    return Boolean(repId && repId === userId.toString());
}

function formatSalesMember(memberObj, userId, role) {
    attachCurrentPackage(memberObj);
    if (memberObj.assignedSales) {
        memberObj.salesRep = memberObj.assignedSales;
    }
    memberObj.Type = memberObj.source;
    memberObj.isAssignedToMe = isAssignedToRep(memberObj, userId);
    if (role === "Sales" && !memberObj.isAssignedToMe) {
        memberObj.phones = null;
    }
    return memberObj;
}

const getMembers = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const filter = buildMemberListFilter({
            status: req.query.status,
            search: req.query.search,
            assignedSales: req.user.role === "Sales" ? req.user.id : req.query.assignedSales,
            unassigned: req.query.unassigned,
            subscribedToday: req.query.subscribedToday,
        });

        const statsFilter = { ...filter };
        delete statsFilter["subscriptions.createdAt"];

        const [total, members] = await Promise.all([
            Member.countDocuments(filter),
            Member.find(filter)
                .populate("assignedSales", "name email")
                .populate("subscriptions.package", "name price duration activityType")
                .sort({ systemId: 1 })
                .skip(skip)
                .limit(limit),
        ]);

        const formatted = members.map((member) =>
            formatSalesMember(member.toObject(), req.user.id, req.user.role)
        );

        const stats = await getMemberStatusStats(Member, statsFilter);

        res.status(200).json({
            count: total,
            members: formatted,
            pagination: buildPagination(page, limit, total),
            stats,
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const getMemberById = async (req, res) => {
    try {
        const identifier = req.params.memberId || req.params.id;
        const member = await findMemberByIdentifier(identifier);
        if (!member) {
            if (!buildMemberFilter(identifier)) {
                return res.status(400).json({ message: "Invalid member ID" });
            }
            return res.status(404).json({ message: "Member not found" });
        }

        await member.populate("assignedSales", "name email");
        await member.populate("subscriptions.package", "name price duration activityType");

        const memberObj = member.toObject();
        if (["Sales", "Sales Manager"].includes(req.user.role)) {
            return res.json(formatSalesMember(memberObj, req.user.id, req.user.role));
        }

        res.json(memberObj);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

////////////// add note /////////////////////////
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

        const identifier = req.params.memberId || req.params.id;
        const member = await findMemberByIdentifier(identifier);
        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        member.notes.push({ text, createdBy: req.user.id });
        await member.save();
        res.status(201).json({ message: "Note added successfully", member });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

///////////////// add alert ///////////////

const addAlert = async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({
                message: "Alert text is required"
            });
        }

        const identifier = req.params.memberId || req.params.id;

        const member = await findMemberByIdentifier(identifier);

        if (!member) {
            return res.status(404).json({
                message: "Member not found"
            });
        }

        member.alert.push({
            text,
            createdBy: req.user.id
        });

        await member.save();

        res.status(201).json({
            message: "Alert added successfully",
            member
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};














const switchSalesRep = async (req, res) => {
    try {
        const { newSalesRepId } = req.body;
        if (!newSalesRepId) {
            return res.status(400).json({ message: "New Sales Rep ID is required" });
        }

        const salesUser = await validateSalesAssignee(newSalesRepId);
        if (!salesUser) {
            return res.status(400).json({
                message: "Invalid salesman — user not found or not a sales role"
            });
        }

        const identifier = req.params.memberId || req.params.id;
        const member = await findMemberByIdentifier(identifier);
        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        member.assignedSales = newSalesRepId;
        member.userlog.push({
            type: "assign",
            text: `Transferred to ${salesUser.name}`,
            createdBy: req.user.id,
        });
        await member.save();

        await notifyMemberAssigned({
            recipientId: newSalesRepId,
            member,
            actorId: req.user.id,
        });

        res.json({ message: "Sales representative updated successfully", member });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const bulkTransferSalesReps = async (req, res) => {
    try {
        const { fromSalesRepId, toSalesRepId, memberIds } = req.body;

        if (!toSalesRepId) {
            return res.status(400).json({ message: "toSalesRepId is required" });
        }

        const toUser = await validateSalesAssignee(toSalesRepId);
        if (!toUser) {
            return res.status(400).json({ message: "Invalid destination sales rep" });
        }

        if (fromSalesRepId && fromSalesRepId === toSalesRepId) {
            return res.status(400).json({ message: "Source and destination sales reps must differ" });
        }

        let fromUser = null;
        if (fromSalesRepId) {
            fromUser = await User.findById(fromSalesRepId);
            if (!fromUser || !["Sales", "Sales Manager"].includes(fromUser.role)) {
                return res.status(400).json({ message: "Invalid source sales rep" });
            }
        }

        let members;

        if (memberIds?.length > 0) {
            members = await Member.find({ _id: { $in: memberIds } });
            if (members.length !== memberIds.length) {
                const found = new Set(members.map((m) => m._id.toString()));
                const missing = memberIds.filter((id) => !found.has(String(id)));
                return res.status(400).json({
                    message: "One or more members not found",
                    invalidMemberIds: missing,
                });
            }
            if (fromSalesRepId) {
                const invalid = members.filter(
                    (m) => !m.assignedSales || m.assignedSales.toString() !== fromSalesRepId
                );
                if (invalid.length > 0) {
                    return res.status(400).json({
                        message: "Some members are not assigned to the source sales rep",
                        invalidMemberIds: invalid.map((m) => m._id),
                    });
                }
            }
        } else if (fromSalesRepId) {
            members = await Member.find({ assignedSales: fromSalesRepId });
        } else {
            return res.status(400).json({ message: "Provide memberIds or fromSalesRepId" });
        }

        members = members.filter(
            (m) => !m.assignedSales || m.assignedSales.toString() !== toSalesRepId
        );

        if (!members.length) {
            return res.status(400).json({ message: "No members to transfer" });
        }

        await Member.populate(members, { path: "assignedSales", select: "name" });

        const transferredIds = [];
        for (const member of members) {
            const prevName = member.assignedSales?.name ?? null;
            member.assignedSales = toSalesRepId;
            const logText = fromUser && prevName
                ? `Bulk transferred from ${prevName} to ${toUser.name}`
                : prevName
                    ? `Transferred from ${prevName} to ${toUser.name}`
                    : `Assigned to ${toUser.name}`;
            member.userlog.push({
                type: "assign",
                text: logText,
                createdBy: req.user.id,
            });
            await member.save();
            await notifyMemberAssigned({
                recipientId: toSalesRepId,
                member,
                actorId: req.user.id,
            });
            transferredIds.push(member._id);
        }

        res.json({
            message: "Members transferred successfully",
            transferredCount: transferredIds.length,
            memberIds: transferredIds,
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ─── 8. Add Invitation ────────────────────────────────────────────────────────
const addInvitation = async (req, res) => {
    try {
        const { memberId } = req.params;
        const { invitedName, invitedPhone } = req.body;

        if (!invitedName || !invitedName.trim()) {
            return res.status(400).json({ message: "Invited person name is required" });
        }

        const member = await findMember(memberId);
        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        // Must have an active subscription with invitation slots
        const currentPkg = getCurrentPackage(member);
        if (!currentPkg) {
            return res.status(400).json({ message: "No active package found" });
        }

        const allowedInvitations = currentPkg.invitationLimit || 0;
        if (member.invitationsUsed >= allowedInvitations) {
            return res.status(400).json({
                message: `Invitation limit reached. Allowed: ${allowedInvitations}`
            });
        }

        // Store uploaded file path if present
        const idFilePath = req.file ? req.file.path : null;

        member.invitations.push({
            invitedName:  invitedName.trim(),
            invitedPhone: invitedPhone || null,
            idFile:       idFilePath,
            usedAt:       new Date(),
            createdBy:    req.user.id
        });
        member.invitationsUsed += 1;

        await member.save();
        await member.populate("invitations.createdBy", "name role");
        const newInvitation = member.invitations[member.invitations.length - 1];

        res.status(201).json({ message: "Invitation added", invitation: newInvitation });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── 10. Get today's check-ins ────────────────────────────────────────────────
const getTodayCheckIns = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Find members who have a check-in userlog entry today
        const members = await Member.find({
            "userlog": {
                $elemMatch: {
                    type: "check-in",
                    createdAt: { $gte: today, $lt: tomorrow }
                }
            }
        })
            .populate("subscriptions.package", "name activityType duration")
            .populate("assignedSales", "name")
            .populate("userlog.createdBy", "name role")
            .select("name systemId memberId phones status subscriptions assignedSales userlog");

        // Extract today's check-in entries with member info
        const checkIns = [];
        members.forEach(member => {
            member.userlog.forEach(log => {
                if (log.type === "check-in" && new Date(log.createdAt) >= today && new Date(log.createdAt) < tomorrow) {
                    checkIns.push({
                        _id:       log._id,
                        time:      log.createdAt,
                        checkedInBy: log.createdBy,
                        member: {
                            _id:       member._id,
                            name:      member.name,
                            systemId:  member.systemId,
                            memberId:  member.memberId,
                            phones:    member.phones,
                            status:    member.status,
                            package:   member.subscriptions?.at(-1)?.package ?? null,
                            assignedSales: member.assignedSales,
                        }
                    });
                }
            });
        });

        // Sort newest first
        checkIns.sort((a, b) => new Date(b.time) - new Date(a.time));

        res.json({ count: checkIns.length, checkIns });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── 9. Get All Notes (for Call Center page — Sales Manager / Owner) ──────────
const getAllNotes = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 25 });
        const match = { "notes.0": { $exists: true } };

        if (req.query.createdBy) {
            match["notes.createdBy"] = req.query.createdBy;
        }

        const search = req.query.search?.trim();
        const searchMatch = search
            ? {
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { phones: { $regex: search, $options: "i" } },
                    { "notes.text": { $regex: search, $options: "i" } },
                ],
            }
            : null;

        const pipeline = [
            { $match: match },
            { $unwind: "$notes" },
            ...(req.query.createdBy ? [{ $match: { "notes.createdBy": req.query.createdBy } }] : []),
            {
                $lookup: {
                    from: "users",
                    localField: "notes.createdBy",
                    foreignField: "_id",
                    as: "noteAuthor",
                },
            },
            { $unwind: { path: "$noteAuthor", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "users",
                    localField: "assignedSales",
                    foreignField: "_id",
                    as: "salesRep",
                },
            },
            { $unwind: { path: "$salesRep", preserveNullAndEmptyArrays: true } },
            ...(searchMatch ? [{ $match: searchMatch }] : []),
            { $sort: { "notes.createdAt": -1 } },
            {
                $facet: {
                    data: [
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $project: {
                                _id: "$notes._id",
                                text: "$notes.text",
                                createdAt: "$notes.createdAt",
                                createdBy: {
                                    _id: "$noteAuthor._id",
                                    name: "$noteAuthor.name",
                                    role: "$noteAuthor.role",
                                },
                                member: {
                                    _id: "$_id",
                                    name: "$name",
                                    systemId: "$systemId",
                                    memberId: "$memberId",
                                    phones: "$phones",
                                    status: "$status",
                                    assignedSales: {
                                        _id: "$salesRep._id",
                                        name: "$salesRep.name",
                                        role: "$salesRep.role",
                                    },
                                },
                            },
                        },
                    ],
                    total: [{ $count: "count" }],
                },
            },
        ];

        const result = await Member.aggregate(pipeline);
        const notes = result[0]?.data ?? [];
        const total = result[0]?.total[0]?.count ?? 0;

        res.status(200).json({
            count: total,
            notes,
            pagination: buildPagination(page, limit, total),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const packageTermsDiffer = (basePkg, terms) => {
    const num = (v, def = 0) => (v != null && v !== "" ? Number(v) : def);
    return (
        terms.name !== basePkg.name ||
        terms.activityType !== basePkg.activityType ||
        terms.duration !== basePkg.duration ||
        num(terms.price) !== basePkg.price ||
        num(terms.freezeLimitDays) !== (basePkg.freezeLimitDays ?? 0) ||
        num(terms.invitationLimit) !== (basePkg.invitationLimit ?? 0) ||
        num(terms.renewalDiscountPercent) !== (basePkg.renewalDiscountPercent ?? 0)
    );
};

// ─── Assign package directly (Accountant only — no approval) ───────────────
const assignPackage = async (req, res) => {
    try {
        const {
            packageId,
            name,
            activityType,
            duration,
            price,
            freezeLimitDays,
            invitationLimit,
            renewalDiscountPercent,
            pricePaid,
            discountPercent,
            startDate,
        } = req.body;

        if (!packageId) {
            return res.status(400).json({ message: "Package ID is required" });
        }
        if (!name?.trim()) {
            return res.status(400).json({ message: "Package name is required" });
        }
        if (!duration) {
            return res.status(400).json({ message: "Duration is required" });
        }
        if (pricePaid == null || pricePaid === "") {
            return res.status(400).json({ message: "Price paid is required" });
        }

        const member = await findMember(req.params.memberId);
        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        const PackageExceptionRequest = require("../models/PackageExceptionRequest");
        const pending = await PackageExceptionRequest.findOne({ member: member._id, status: "pending" });
        if (pending) {
            return res.status(400).json({ message: "This member has a pending package exception awaiting approval" });
        }

        const basePkg = await Package.findById(packageId);
        if (!basePkg || !basePkg.isActive || basePkg.hasException) {
            return res.status(400).json({ message: "Package not found or unavailable" });
        }

        const terms = {
            name: name.trim(),
            activityType: activityType ?? basePkg.activityType,
            duration,
            price: price != null && price !== "" ? Number(price) : basePkg.price,
            freezeLimitDays: Number(freezeLimitDays) || 0,
            invitationLimit: Number(invitationLimit) || 0,
            renewalDiscountPercent: Number(renewalDiscountPercent) || 0,
        };

        let packageToAssign = basePkg._id;
        let packageName = basePkg.name;

        if (packageTermsDiffer(basePkg, terms)) {
            const exceptionPkg = await Package.create({
                name: terms.name,
                activityType: terms.activityType,
                duration: terms.duration,
                price: terms.price,
                freezeLimitDays: terms.freezeLimitDays,
                invitationLimit: terms.invitationLimit,
                renewalDiscountPercent: terms.renewalDiscountPercent,
                isActive: true,
                hasException: true,
                basedOn: basePkg._id,
                forMember: member._id,
                createdBy: req.user.id,
            });
            packageToAssign = exceptionPkg._id;
            packageName = exceptionPkg.name;
        }

        const start = startDate ? new Date(startDate) : new Date();
        const endDate = calcEndDate(start, terms.duration);
        const subscriptionId = await generateSubscriptionId();
        const hadSubscription = member.subscriptions?.length > 0;

        if (!member.memberId) {
            member.memberId = await generateMemberId();
        }

        member.isMember = true;
        member.status = "active";
        member.subscriptions.push({
            subscriptionId,
            package: packageToAssign,
            startDate: start,
            endDate,
            pricePaid: Number(pricePaid),
            discountPercent: Number(discountPercent) || 0,
            isRenewal: hadSubscription,
            createdBy: req.user.id,
            approvedBy: req.user.id,
            salesManager: null,
        });
        member.freezeDaysUsed = 0;
        member.invitationsUsed = 0;
        member.userlog.push({
            type: hadSubscription ? "renewal" : "other",
            text: packageTermsDiffer(basePkg, terms)
                ? `Package assigned (exception): ${packageName}`
                : `Package assigned: ${packageName}`,
            createdBy: req.user.id,
        });

        await member.save();
        res.status(200).json({ message: "Package assigned successfully", member });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Upload National ID (Accountant only) ─────────────────────────────────────
const uploadNationalId = async (req, res) => {
    try {
        if (req.user.role !== "Accountant") {
            return res.status(403).json({ message: "Only accountants can upload national IDs" });
        }

        const identifier = req.params.memberId;
        const member = await findMemberByIdentifier(identifier);
        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "National ID file is required" });
        }

        member.nationalId = req.file.path;
        await member.save();

        res.json({ message: "National ID uploaded", nationalId: member.nationalId });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
////////////////// deactivate alert////////////////////
const deactivateAlert = async (req, res) => {
    try {
        const identifier = req.params.memberId;
        const alertId = req.params.alertId;

        const member = await findMemberByIdentifier(identifier);
        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        const alert = member.alert.id(alertId);
        if (!alert) {
            return res.status(404).json({ message: "Alert not found" });
        }

        alert.active = false;
        await member.save();

        res.json({ message: "Alert deactivated", alert });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


module.exports = {
    createMember,
    getAllMembers,
    getMemberProfile,
    checkInMember,
    assignSalesman,
    freezeMember,
    getMembers,
    getMemberById,
    addNote,
    addAlert,
    deactivateAlert,
    switchSalesRep,
    bulkTransferSalesReps,
    addInvitation,
    getAllNotes,
    assignPackage,
    getTodayCheckIns,
    uploadNationalId,
};
