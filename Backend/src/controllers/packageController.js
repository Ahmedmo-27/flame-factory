const Package = require("../models/Package");
const Member = require("../models/Member");

const getPackages = async (req, res) => {
    try {
        const packages = await Package.find().sort({ createdAt: -1 });
        res.json(packages);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const getPackageById = async (req, res) => {
    try {
        const pkg = await Package.findById(req.params.id);
        if (!pkg) {
            return res.status(404).json({ message: "Package not found" });
        }
        res.json(pkg);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const createPackage = async (req, res) => {
    try {
        const { name, type, price, durationMonths, sessionsLimit, freezeLimitDays, hasCoach, isActive } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ message: "Package name is required" });
        }
        if (!type?.trim()) {
            return res.status(400).json({ message: "Package type is required" });
        }
        if (price === undefined || price === null || Number(price) < 0) {
            return res.status(400).json({ message: "Valid price is required" });
        }
        if (!durationMonths || Number(durationMonths) < 1) {
            return res.status(400).json({ message: "Duration must be at least 1 month" });
        }

        const pkg = await Package.create({
            name: name.trim(),
            type: type.trim(),
            price: Number(price),
            durationMonths: Number(durationMonths),
            sessionsLimit: sessionsLimit != null && sessionsLimit !== "" ? Number(sessionsLimit) : null,
            freezeLimitDays: Number(freezeLimitDays) || 0,
            hasCoach: Boolean(hasCoach),
            isActive: isActive !== false,
            createdBy: req.user.id,
        });

        res.status(201).json({ message: "Package created", package: pkg });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const updatePackage = async (req, res) => {
    try {
        const pkg = await Package.findById(req.params.id);
        if (!pkg) {
            return res.status(404).json({ message: "Package not found" });
        }

        const { name, type, price, durationMonths, sessionsLimit, freezeLimitDays, hasCoach, isActive } = req.body;

        if (name !== undefined) {
            if (!name?.trim()) {
                return res.status(400).json({ message: "Package name cannot be empty" });
            }
            pkg.name = name.trim();
        }
        if (type !== undefined) {
            if (!type?.trim()) {
                return res.status(400).json({ message: "Package type cannot be empty" });
            }
            pkg.type = type.trim();
        }
        if (price !== undefined) {
            if (Number(price) < 0) {
                return res.status(400).json({ message: "Price cannot be negative" });
            }
            pkg.price = Number(price);
        }
        if (durationMonths !== undefined) {
            if (Number(durationMonths) < 1) {
                return res.status(400).json({ message: "Duration must be at least 1 month" });
            }
            pkg.durationMonths = Number(durationMonths);
        }
        if (sessionsLimit !== undefined) {
            pkg.sessionsLimit = sessionsLimit != null && sessionsLimit !== "" ? Number(sessionsLimit) : null;
        }
        if (freezeLimitDays !== undefined) {
            pkg.freezeLimitDays = Number(freezeLimitDays) || 0;
        }
        if (hasCoach !== undefined) {
            pkg.hasCoach = Boolean(hasCoach);
        }
        if (isActive !== undefined) {
            pkg.isActive = Boolean(isActive);
        }

        await pkg.save();
        res.json({ message: "Package updated", package: pkg });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const deletePackage = async (req, res) => {
    try {
        const pkg = await Package.findById(req.params.id);
        if (!pkg) {
            return res.status(404).json({ message: "Package not found" });
        }

        const memberCount = await Member.countDocuments({ package: pkg._id });
        if (memberCount > 0) {
            return res.status(400).json({
                message: `Cannot delete package — ${memberCount} member${memberCount !== 1 ? "s are" : " is"} assigned to it`,
            });
        }

        await pkg.deleteOne();
        res.json({ message: "Package deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    getPackages,
    getPackageById,
    createPackage,
    updatePackage,
    deletePackage,
};
