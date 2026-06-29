const Member = require("../models/Member");
const Package = require("../models/Package");
const User = require("../models/User");
const ProfileView = require("../models/ProfileView");
const { resolveAbilities } = require("../utils/userAbilities");
const { attachCurrentPackage } = require("../utils/revenueUtils");
const { findMemberByIdentifier, buildMemberFilter } = require("../utils/memberLookup");

// ─── Helper: get current package from last subscription ───────────────────────
const getCurrentPackage = (member) => {
    if (!member.subscriptions || !member.subscriptions.length) return null;
    return member.subscriptions[member.subscriptions.length - 1].package;
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
    const numId = Number(id);
    const isNumeric = !isNaN(numId) && numId >= 100;
    const query = isNumeric
        ? { $or: [{ systemId: numId }, { memberId: numId }] }
        : { _id: id };
    return Member.findOne(query).populate("subscriptions.package");
};

// ─── 1. Add Person (guest or member) ─────────────────────────────────────────
const createMember = async (req, res) => {
    try {
        const {
            name, phones, nationalId, photo,
            gender, birthdate, source,
            packageId, assignedSales
        } = req.body;

        const systemId = await generateSystemId();

        const personData = {
            systemId,
            name,
            phones,
            nationalId:    nationalId    || null,
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
        res.status(201).json({ message: packageId ? "Member created" : "Guest added", member });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── 2. Get All Members ───────────────────────────────────────────────────────
const getAllMembers = async (req, res) => {
    try {
        const members = await Member.find()
            .populate("subscriptions.package", "name duration activityType")
            .populate("createdBy", "name")
            .populate("assignedSales", "name role")
            .sort({ systemId: 1 });

        res.status(200).json({ count: members.length, members });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── 3. Get Member Profile ────────────────────────────────────────────────────
const getMemberProfile = async (req, res) => {
    try {
        const { memberId } = req.params;
        const numId = Number(memberId);
        const isNumeric = !isNaN(numId) && numId >= 100;
        const query = isNumeric
            ? { $or: [{ systemId: numId }, { memberId: numId }] }
            : { _id: memberId };

        const member = await Member.findOne(query)
            .populate("subscriptions.package", "name duration activityType price freezeLimitDays invitationLimit renewalDiscountPercent")
            .populate("subscriptions.createdBy", "name")
            .populate("createdBy", "name role")
            .populate("assignedSales", "name role")
            .populate("notes.createdBy", "name")
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

        res.status(200).json({
            member,
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

        const salesUser = await User.findById(salesId);
        if (!salesUser || !["Sales", "Sales Manager"].includes(salesUser.role)) {
            return res.status(400).json({
                message: "Invalid salesman — user not found or not a sales role"
            });
        }

        const member = await findMember(memberId);
        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        member.assignedSales = salesId;
        await member.save();
        await member.populate("assignedSales", "name role");

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
        member.status = "frozen";
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

function formatSalesMember(memberObj, userId) {
    attachCurrentPackage(memberObj);
    if (memberObj.assignedSales) {
        memberObj.salesRep = memberObj.assignedSales;
    }
    memberObj.Type = memberObj.source;
    memberObj.isAssignedToMe = isAssignedToRep(memberObj, userId);
    if (!memberObj.isAssignedToMe) {
        memberObj.phones = null;
    }
    return memberObj;
}

const salesMemberQuery = () =>
    Member.find()
        .populate("assignedSales", "name email")
        .populate("subscriptions.package", "name price duration activityType");

const getMembers = async (req, res) => {
    try {
        if (req.user.role === "Sales") {
            const members = await Member.find({ assignedSales: req.user.id })
                .populate("assignedSales", "name email")
                .populate("subscriptions.package", "name price duration activityType");

            return res.json(
                members.map((member) => formatSalesMember(member.toObject(), req.user.id))
            );
        }

        const members = await salesMemberQuery();
        res.json(members.map((member) => formatSalesMember(member.toObject(), req.user.id)));
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
            return res.json(formatSalesMember(memberObj, req.user.id));
        }

        res.json(memberObj);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

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

const switchSalesRep = async (req, res) => {
    try {
        const { newSalesRepId } = req.body;
        if (!newSalesRepId) {
            return res.status(400).json({ message: "New Sales Rep ID is required" });
        }

        const identifier = req.params.memberId || req.params.id;
        const member = await findMemberByIdentifier(identifier);
        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        member.assignedSales = newSalesRepId;
        await member.save();

        res.json({ message: "Sales representative updated successfully", member });
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

// ─── 9. Get All Notes (for Call Center page — Sales Manager / Owner) ──────────
const getAllNotes = async (req, res) => {
    try {
        const members = await Member.find({ "notes.0": { $exists: true } })
            .populate("notes.createdBy", "name role")
            .select("name systemId memberId phones status notes assignedSales")
            .populate("assignedSales", "name role");

        // Flatten all notes into a single array with member context
        const notes = [];
        members.forEach(member => {
            member.notes.forEach(note => {
                notes.push({
                    _id:        note._id,
                    text:       note.text,
                    createdAt:  note.createdAt,
                    createdBy:  note.createdBy,
                    member: {
                        _id:      member._id,
                        name:     member.name,
                        systemId: member.systemId,
                        memberId: member.memberId,
                        phones:   member.phones,
                        status:   member.status,
                        assignedSales: member.assignedSales,
                    }
                });
            });
        });

        // Sort newest first
        notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json({ count: notes.length, notes });
    } catch (error) {
        res.status(500).json({ message: error.message });
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
    switchSalesRep,
    addInvitation,
    getAllNotes
};
