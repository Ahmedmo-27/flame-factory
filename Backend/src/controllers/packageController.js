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

module.exports = { createPackage, getAllPackages };
