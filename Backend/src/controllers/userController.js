const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Register
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({ name, email, password: hashedPassword, role });

        res.status(201).json({
            message: "User created",
            user: { _id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Login
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid password" });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful",
            token,
            user: { _id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all users with sales role — for dropdowns
const getSalesUsers = async (req, res) => {
    try {
        const salesUsers = await User.find(
            { role: { $in: ["Sales", "Sales Manager"] } },
            "name role"
        ).sort({ name: 1 });

        res.status(200).json({ salesUsers });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get full sales team with stats (for team page)
const getSalesTeam = async (req, res) => {
    try {
        const Member = require("../models/Member");

        const salesUsers = await User.find(
            { role: { $in: ["Sales", "Sales Manager"] } },
            "name email role monthlyTarget abilities createdAt"
        ).sort({ name: 1 });

        // For each sales user, compute their member stats
        const team = await Promise.all(salesUsers.map(async (u) => {
            const members = await Member.find({ assignedSales: u._id });
            const active  = members.filter(m => m.status === "active").length;
            const frozen  = members.filter(m => m.status === "frozen").length;
            const expired = members.filter(m => m.status === "expired").length;
            const guests  = members.filter(m => m.status === "guest").length;

            // Revenue this month
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            let monthlyRevenue = 0;
            members.forEach(m => {
                (m.subscriptions || []).forEach(sub => {
                    if (new Date(sub.createdAt) >= monthStart) {
                        monthlyRevenue += sub.pricePaid || 0;
                    }
                });
            });

            return {
                _id:            u._id,
                name:           u.name,
                email:          u.email,
                role:           u.role,
                monthlyTarget:  u.monthlyTarget,
                abilities:      u.abilities,
                createdAt:      u.createdAt,
                stats: {
                    total:          members.length,
                    active,
                    frozen,
                    expired,
                    guests,
                    monthlyRevenue,
                }
            };
        }));

        res.status(200).json({ team });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single sales user profile with full member list
const getSalesProfile = async (req, res) => {
    try {
        const Member = require("../models/Member");

        const u = await User.findById(req.params.id, "name email role monthlyTarget abilities createdAt");
        if (!u) return res.status(404).json({ message: "User not found" });

        const members = await Member.find({ assignedSales: u._id })
            .populate("subscriptions.package", "name duration activityType price")
            .sort({ createdAt: -1 });

        const now        = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        let monthlyRevenue = 0;
        members.forEach(m => {
            (m.subscriptions || []).forEach(sub => {
                if (new Date(sub.createdAt) >= monthStart) monthlyRevenue += sub.pricePaid || 0;
            });
        });

        res.status(200).json({
            user: {
                _id:           u._id,
                name:          u.name,
                email:         u.email,
                role:          u.role,
                monthlyTarget: u.monthlyTarget,
                abilities:     u.abilities,
                createdAt:     u.createdAt,
            },
            members,
            stats: {
                total:          members.length,
                active:         members.filter(m => m.status === "active").length,
                frozen:         members.filter(m => m.status === "frozen").length,
                expired:        members.filter(m => m.status === "expired").length,
                guests:         members.filter(m => m.status === "guest").length,
                monthlyRevenue,
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { registerUser, loginUser, getSalesUsers, getSalesTeam, getSalesProfile };
