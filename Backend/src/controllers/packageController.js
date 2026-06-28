const Package = require("../models/Package");

// Create package
const createPackage = async (req, res) => {
    try {
        const pkg = await Package.create({
            ...req.body,
            createdBy: req.user.id
        });
        res.status(201).json({ message: "Package created", package: pkg });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all active packages
const getAllPackages = async (req, res) => {
    try {
        const packages = await Package.find({ isActive: true }).sort({ createdAt: -1 });
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
