const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { formatUserResponse } = require("../utils/userAbilities");
const logger = require("../utils/logger");
const { hashPassword, verifyPassword, normalizeEmail } = require("../utils/passwordUtils");
const {
    monthKey,
    dayKey,
    isSameDay,
    buildMonthlyMap,
    memberPrice,
    getCurrentSubscription,
} = require("../utils/revenueUtils");

const registerUser = async (req, res) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
        logger.auth("info", "Register attempt", {
            requestId,
            ip: req.ip,
            hasJwtSecret: Boolean(process.env.JWT_SECRET),
        });

        if (!process.env.JWT_SECRET) {
            logger.auth("error", "Register blocked: JWT_SECRET missing", { requestId });
            return res.status(500).json({ message: "Server misconfigured: JWT_SECRET is missing" });
        }

        const { name, password } = req.body;
        const email = normalizeEmail(req.body.email);

        if (!email || !password) {
            logger.auth("warn", "Register validation failed", { requestId, reason: "missing_fields" });
            return res.status(400).json({ message: "Email and password are required" });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            logger.auth("warn", "Register rejected: user exists", { requestId, email });
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await hashPassword(password);
        const user = await User.create({ name, email, password: hashedPassword, role: "Receptionist" });

        logger.auth("info", "Register success", {
            requestId,
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        });

        res.status(201).json({
            message: "User created",
            user: { _id: user._id, name: user.name, email: user.email, role: user.role },
        });
    } catch (error) {
        logger.auth("error", "Register error", { requestId, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const loginUser = async (req, res) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
        const rawEmail = req.body?.email;
        const email = normalizeEmail(rawEmail);
        const passwordProvided = Boolean(req.body?.password);
        const passwordLength = req.body?.password ? String(req.body.password).length : 0;

        logger.auth("info", "Login attempt", {
            requestId,
            ip: req.ip,
            userAgent: req.get("user-agent"),
            rawEmail: rawEmail || null,
            normalizedEmail: email || null,
            emailNormalized: rawEmail !== email,
            passwordProvided,
            passwordLength,
            hasJwtSecret: Boolean(process.env.JWT_SECRET),
            apiBaseHint: req.get("origin") || req.get("referer") || null,
        });

        if (!process.env.JWT_SECRET) {
            logger.auth("error", "Login blocked: JWT_SECRET missing", { requestId, email });
            return res.status(500).json({ message: "Server misconfigured: JWT_SECRET is missing" });
        }

        if (!email || !req.body?.password) {
            logger.auth("warn", "Login validation failed", { requestId, reason: "missing_fields" });
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            logger.auth("warn", "Login failed: user not found", { requestId, email });
            return res.status(400).json({ message: "User not found" });
        }

        const { match, inspection, compareSkipped } = await verifyPassword(
            req.body.password,
            user.password,
            { requestId, userId: user._id.toString(), email }
        );

        if (compareSkipped || !match) {
            logger.auth("warn", "Login failed: invalid password", {
                requestId,
                userId: user._id.toString(),
                email,
                inspection,
                compareSkipped,
            });
            return res.status(400).json({ message: "Invalid password" });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        logger.auth("info", "Login success", {
            requestId,
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        });

        res.json({
            message: "Login successful",
            token,
            user: formatUserResponse(user),
        });
    } catch (error) {
        logger.auth("error", "Login error", { requestId, error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const getSalesUsers = async (req, res) => {
    try {
        const salesUsers = await User.find(
            { role: { $in: ["Sales", "Sales Manager"] } },
            "name role _id"
        ).sort({ name: 1 });

        res.status(200).json({ salesUsers });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSalesRevenue = async (req, res) => {
    try {
        if (req.user.role !== "Sales") {
            return res.status(403).json({ message: "Only sales representatives can access this" });
        }

        const Member = require("../models/Member");
        require("../models/Package");

        const members = await Member.find({ assignedSales: req.user.id })
            .populate("subscriptions.package");

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
        const lastMonthYear = lastMonthDate.getFullYear();
        const lastMonth = lastMonthDate.getMonth();

        const isInMonth = (date, year, month) => {
            const d = new Date(date);
            return d.getFullYear() === year && d.getMonth() === month;
        };

        const monthlyMap = buildMonthlyMap(6, now);

        let currentMonthRevenue = 0;
        let lastMonthRevenue = 0;
        let totalRevenue = 0;

        members.forEach((member) => {
            const price = memberPrice(member);
            if (!price) return;

            const sub = getCurrentSubscription(member);
            const saleDate = sub?.createdAt || member.createdAt;

            totalRevenue += price;
            const key = monthKey(saleDate);

            if (monthlyMap[key]) {
                monthlyMap[key].revenue += price;
                monthlyMap[key].salesCount += 1;
            }

            if (isInMonth(saleDate, currentYear, currentMonth)) {
                currentMonthRevenue += price;
            }
            if (isInMonth(saleDate, lastMonthYear, lastMonth)) {
                lastMonthRevenue += price;
            }
        });

        res.json({
            currency: "EGP",
            currentMonth: monthKey(now),
            currentMonthRevenue,
            lastMonthRevenue,
            totalRevenue,
            monthlyBreakdown: Object.values(monthlyMap),
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const getSalesManagerRevenue = async (req, res) => {
    try {
        if (!["Sales Manager", "Owner"].includes(req.user.role)) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const Member = require("../models/Member");
        require("../models/Package");

        const now = new Date();
        const selectedMonth = req.query.month || monthKey(now);

        const [members, reps] = await Promise.all([
            Member.find()
                .populate("subscriptions.package", "name price")
                .populate("assignedSales", "name email"),
            User.find({ role: "Sales" }).select("name email _id monthlyTarget"),
        ]);

        const monthlyMap = buildMonthlyMap(12, now);
        let currentDayRevenue = 0;
        let currentMonthRevenue = 0;
        let selectedMonthRevenue = 0;

        const repStats = {};
        reps.forEach((rep) => {
            repStats[rep._id.toString()] = {
                rep: {
                    _id: rep._id,
                    name: rep.name,
                    email: rep.email,
                    monthlyTarget: rep.monthlyTarget ?? 0,
                },
                revenue: 0,
                salesCount: 0,
            };
        });

        members.forEach((member) => {
            const price = memberPrice(member);
            if (!price) return;

            const sub = getCurrentSubscription(member);
            const createdAt = sub?.createdAt || member.createdAt;
            const key = monthKey(createdAt);

            if (monthlyMap[key]) {
                monthlyMap[key].revenue += price;
                monthlyMap[key].salesCount += 1;
            }

            if (isSameDay(createdAt, now)) {
                currentDayRevenue += price;
            }

            if (key === monthKey(now)) {
                currentMonthRevenue += price;
            }

            if (key === selectedMonth) {
                selectedMonthRevenue += price;
            }

            const repId = member.assignedSales?._id?.toString() || member.assignedSales?.toString();
            if (repId && repStats[repId] && key === selectedMonth) {
                repStats[repId].revenue += price;
                repStats[repId].salesCount += 1;
            }
        });

        const repBreakdown = Object.values(repStats)
            .map((entry) => ({
                ...entry,
                targetProgress: entry.rep.monthlyTarget
                    ? Math.round((entry.revenue / entry.rep.monthlyTarget) * 100)
                    : null,
            }))
            .sort((a, b) => b.revenue - a.revenue);

        res.json({
            currency: "EGP",
            currentDay: dayKey(now),
            currentDayRevenue,
            currentMonth: monthKey(now),
            currentMonthRevenue,
            selectedMonth,
            selectedMonthRevenue,
            monthlyBreakdown: Object.values(monthlyMap),
            repBreakdown,
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const getSalesReps = async (req, res) => {
    try {
        if (!["Sales Manager", "Owner"].includes(req.user.role)) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const reps = await User.find({ role: "Sales" }).select("name email _id abilities monthlyTarget createdAt");
        res.json(reps.map(formatUserResponse));
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(formatUserResponse(user));
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isSelf = req.user.id === user._id.toString();
        const isManager = ["Sales Manager", "Owner"].includes(req.user.role);

        if (!isSelf && !isManager) {
            return res.status(403).json({ message: "Not authorized" });
        }

        if (user.role !== "Sales" && !isSelf) {
            return res.status(400).json({ message: "Profile is only available for sales representatives" });
        }

        res.json(formatUserResponse(user));
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const STATUS_STAT_KEYS = { active: "active", frozen: "frozen", expired: "expired", guest: "guests" };

function buildRepStats(members, repId, now = new Date()) {
    const stats = { total: 0, active: 0, frozen: 0, expired: 0, guests: 0, monthlyRevenue: 0 };
    const repKey = repId.toString();
    const currentMonthKey = monthKey(now);

    members.forEach((member) => {
        const assignedId = member.assignedSales?._id?.toString() || member.assignedSales?.toString();
        if (assignedId !== repKey) return;

        stats.total += 1;
        const statKey = STATUS_STAT_KEYS[member.status];
        if (statKey) stats[statKey] += 1;

        const price = memberPrice(member);
        if (!price) return;

        const sub = getCurrentSubscription(member);
        const saleDate = sub?.createdAt || member.createdAt;
        if (monthKey(saleDate) === currentMonthKey) {
            stats.monthlyRevenue += price;
        }
    });

    return stats;
}

const getSalesTeam = async (req, res) => {
    try {
        const Member = require("../models/Member");
        require("../models/Package");

        const [team, members] = await Promise.all([
            User.find({ role: { $in: ["Sales", "Sales Manager"] } })
                .select("name email role monthlyTarget abilities createdAt")
                .sort({ name: 1 }),
            Member.find().populate("subscriptions.package"),
        ]);

        const now = new Date();
        const teamWithStats = team.map((user) => ({
            ...formatUserResponse(user),
            stats: buildRepStats(members, user._id, now),
        }));

        res.json({ team: teamWithStats });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const getSalesProfile = async (req, res) => {
    try {
        const Member = require("../models/Member");
        require("../models/Package");

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!["Sales", "Sales Manager"].includes(user.role)) {
            return res.status(400).json({ message: "Profile is only available for sales team members" });
        }

        const members = await Member.find({ assignedSales: user._id })
            .populate("subscriptions.package", "name price duration activityType");

        res.json({
            user: formatUserResponse(user),
            stats: buildRepStats(members, user._id),
            members: members.map((m) => m.toObject()),
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const updateSalesRepTarget = async (req, res) => {
    try {
        if (req.user.role !== "Sales Manager") {
            return res.status(403).json({ message: "Only sales managers can update representative targets" });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.role !== "Sales") {
            return res.status(400).json({ message: "Targets can only be set for sales representatives" });
        }

        const { monthlyTarget } = req.body;
        if (monthlyTarget === undefined || monthlyTarget === null) {
            return res.status(400).json({ message: "monthlyTarget is required" });
        }

        const target = Number(monthlyTarget);
        if (isNaN(target) || target < 0) {
            return res.status(400).json({ message: "monthlyTarget must be a number >= 0" });
        }

        user.monthlyTarget = target;
        await user.save();
        res.json({ message: "Target updated", user: formatUserResponse(user) });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const createStaffUser = async (req, res) => {
    try {
        if (!["Sales Manager", "Owner"].includes(req.user.role)) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const { name, email, password, role } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: "name, email, password, and role are required" });
        }

        if (!["Sales", "Receptionist"].includes(role)) {
            return res.status(400).json({ message: "Role must be Sales or Receptionist" });
        }

        const userExists = await User.findOne({ email: normalizeEmail(email) });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        const normalizedEmail = normalizeEmail(email);
        const hashedPassword = await hashPassword(password);

        const user = await User.create({ name, email: normalizedEmail, password: hashedPassword, role });

        logger.auth("info", "Staff user created", {
            createdBy: req.user.id,
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        });

        res.status(201).json({
            message: "Staff user created",
            user: formatUserResponse(user),
        });
    } catch (error) {
        logger.auth("error", "Staff user create error", { error: error.message, stack: error.stack });
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const updateSalesRepAbilities = async (req, res) => {
    try {
        if (req.user.role !== "Sales Manager") {
            return res.status(403).json({ message: "Only sales managers can update representative permissions" });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.role !== "Sales") {
            return res.status(400).json({ message: "Abilities can only be updated for sales representatives" });
        }

        const { abilities } = req.body;
        if (!abilities || typeof abilities !== "object") {
            return res.status(400).json({ message: "Abilities object is required" });
        }

        const allowedKeys = ["canCommentOnMembers", "canRequestAssignment", "canRequestTakeover"];
        for (const key of allowedKeys) {
            if (abilities[key] !== undefined) {
                user.abilities[key] = Boolean(abilities[key]);
            }
        }

        await user.save();
        res.json({ message: "Abilities updated", user: formatUserResponse(user) });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getSalesUsers,
    getSalesRevenue,
    getSalesManagerRevenue,
    getSalesReps,
    getMyProfile,
    getUserById,
    updateSalesRepTarget,
    createStaffUser,
    updateSalesRepAbilities,
    getSalesTeam,
    getSalesProfile,
};
