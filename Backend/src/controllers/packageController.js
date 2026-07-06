const Package = require("../models/Package");

// Create catalog package (Sales Manager / Owner)
const createPackage = async (req, res) => {
    try {
        const {
            name,
            activityType,
            duration,
            price,
            freezeLimitDays,
            invitationLimit,
            renewalDiscountPercent,
            description,
        } = req.body;

        if (!name?.trim() || price == null) {
            return res.status(400).json({ message: "Name and price are required" });
        }

        const pkg = await Package.create({
            name: name.trim(),
            activityType: activityType || "gym",
            duration,
            price: Number(price),
            freezeLimitDays: Number(freezeLimitDays) || 0,
            invitationLimit: Number(invitationLimit) || 0,
            renewalDiscountPercent: Number(renewalDiscountPercent) || 0,
            description: description?.trim() || null,
            isActive: true,
            hasException: false,
            createdBy: req.user.id,
        });
        res.status(201).json({ message: "Package created", package: pkg });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all active packages
const getAllPackages = async (req, res) => {
    try {
        const packages = await Package.find({ isActive: true, hasException: { $ne: true } }).sort({ createdAt: -1 });
        res.status(200).json({ count: packages.length, packages });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update package
const updatePackage = async (req, res) => {
    try {
        const pkg = await Package.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!pkg) return res.status(404).json({ message: "Package not found" });
        res.status(200).json({ message: "Package updated", package: pkg });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete package (soft delete — set isActive false)
const deletePackage = async (req, res) => {
    try {
        const pkg = await Package.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );
        if (!pkg) return res.status(404).json({ message: "Package not found" });
        res.status(200).json({ message: "Package deactivated" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createPackage, getAllPackages, updatePackage, deletePackage };
