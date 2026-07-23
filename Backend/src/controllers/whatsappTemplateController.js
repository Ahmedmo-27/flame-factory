const WhatsAppTemplate = require("../models/WhatsAppTemplate");
const { parsePagination, buildPagination } = require("../utils/pagination");

const MANAGER_ROLES = new Set(["Owner", "Sales Manager", "Accountant"]);

const createTemplate = async (req, res) => {
    try {
        const { name, type, introText, bodyText, includeLiveData } = req.body;

        if (!name?.trim() || !type?.trim()) {
            return res.status(400).json({ message: "Name and type are required" });
        }

        const normalizedType = String(type).trim().toLowerCase();
        const isBuiltin = normalizedType === "packages" || normalizedType === "discounts";

        const template = await WhatsAppTemplate.create({
            name: name.trim(),
            type: normalizedType,
            introText: introText?.trim() || "",
            bodyText: bodyText?.trim() || "",
            includeLiveData: isBuiltin
                ? (includeLiveData !== false && includeLiveData !== "false")
                : false,
            isActive: true,
            createdBy: req.user.id,
        });

        res.status(201).json({ message: "Template created", template });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getTemplates = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
        const isManager = MANAGER_ROLES.has(req.user.role);
        const filter = isManager && req.query.all === "true"
            ? {}
            : { isActive: true };

        const [total, templates] = await Promise.all([
            WhatsAppTemplate.countDocuments(filter),
            WhatsAppTemplate.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("createdBy", "name role"),
        ]);

        res.status(200).json({
            count: total,
            templates,
            pagination: buildPagination(page, limit, total),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateTemplate = async (req, res) => {
    try {
        const updates = { ...req.body };
        if (updates.type != null) {
            updates.type = String(updates.type).trim().toLowerCase();
        }
        if (updates.name != null) updates.name = String(updates.name).trim();
        if (updates.introText != null) updates.introText = String(updates.introText).trim();
        if (updates.bodyText != null) updates.bodyText = String(updates.bodyText).trim();

        if (updates.type != null) {
            const isBuiltin = updates.type === "packages" || updates.type === "discounts";
            if (!isBuiltin) updates.includeLiveData = false;
        }

        const template = await WhatsAppTemplate.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );
        if (!template) return res.status(404).json({ message: "Template not found" });
        res.status(200).json({ message: "Template updated", template });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteTemplate = async (req, res) => {
    try {
        const template = await WhatsAppTemplate.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );
        if (!template) return res.status(404).json({ message: "Template not found" });
        res.status(200).json({ message: "Template deactivated" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createTemplate, getTemplates, updateTemplate, deleteTemplate };
