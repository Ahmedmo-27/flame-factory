const WhatsAppTemplate = require("../models/WhatsAppTemplate");
const { parsePagination, buildPagination } = require("../utils/pagination");
const { writeAudit } = require("../utils/audit");

const MANAGER_ROLES = new Set(["Owner", "Sales Manager", "Accountant"]);

const STARTER_TEMPLATES = [
    {
        name: "Our packages",
        type: "packages",
        introText: "Hi {{firstName}}! Here are our current packages:",
        bodyText: "Let me know which one works for you.",
        introTextAr: "مرحباً {{firstName}}! هذه باقاتنا الحالية:",
        bodyTextAr: "أخبرني أي باقة تناسبك.",
        includeLiveData: true,
        isDefault: true,
    },
    {
        name: "Special discount",
        type: "discounts",
        introText: "Hi {{firstName}}! We have a special offer for you:",
        bodyText: "This discount is available for a limited time.",
        introTextAr: "مرحباً {{firstName}}! لدينا عرض خاص لك:",
        bodyTextAr: "هذا الخصم متاح لفترة محدودة.",
        includeLiveData: true,
        defaultDiscountPercent: 15,
        isDefault: true,
    },
];

async function ensureStarterTemplates(createdBy) {
    const count = await WhatsAppTemplate.countDocuments();
    if (count > 0) return;
    await WhatsAppTemplate.insertMany(
        STARTER_TEMPLATES.map((t) => ({ ...t, createdBy, isActive: true, allowedRoles: [] }))
    );
}

function normalizePackageIds(ids) {
    if (!Array.isArray(ids)) return [];
    return ids.map((id) => String(id)).filter((id) => /^[a-f\d]{24}$/i.test(id));
}

function normalizeAllowedRoles(roles) {
    if (!Array.isArray(roles)) return [];
    const allowed = new Set(["Owner", "Sales Manager", "Sales", "Receptionist", "Accountant"]);
    return roles.filter((r) => allowed.has(r));
}

async function clearOtherDefaults(type, exceptId) {
    const filter = { type, isDefault: true };
    if (exceptId) filter._id = { $ne: exceptId };
    await WhatsAppTemplate.updateMany(filter, { $set: { isDefault: false } });
}

const createTemplate = async (req, res) => {
    try {
        const {
            name,
            type,
            introText,
            bodyText,
            introTextAr,
            bodyTextAr,
            includeLiveData,
            defaultPackageIds,
            defaultDiscountPercent,
            allowedRoles,
            isDefault,
        } = req.body;

        if (!name?.trim() || !type?.trim()) {
            return res.status(400).json({ message: "Name and type are required" });
        }

        const normalizedType = String(type).trim().toLowerCase();
        const isBuiltin = normalizedType === "packages" || normalizedType === "discounts";
        const wantDefault = isDefault === true || isDefault === "true";

        if (wantDefault) await clearOtherDefaults(normalizedType);

        const template = await WhatsAppTemplate.create({
            name: name.trim(),
            type: normalizedType,
            introText: introText?.trim() || "",
            bodyText: bodyText?.trim() || "",
            introTextAr: introTextAr?.trim() || "",
            bodyTextAr: bodyTextAr?.trim() || "",
            includeLiveData: isBuiltin
                ? (includeLiveData !== false && includeLiveData !== "false")
                : false,
            defaultPackageIds: isBuiltin ? normalizePackageIds(defaultPackageIds) : [],
            defaultDiscountPercent: normalizedType === "discounts"
                ? Math.min(100, Math.max(0, Number(defaultDiscountPercent) || 0))
                : 0,
            allowedRoles: normalizeAllowedRoles(allowedRoles),
            isDefault: wantDefault,
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
        const isManager = MANAGER_ROLES.has(req.user.role);
        if (isManager && req.query.all === "true") {
            await ensureStarterTemplates(req.user.id);
        }

        const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
        let filter;
        if (isManager && req.query.all === "true") {
            filter = {};
        } else {
            filter = {
                isActive: true,
                $or: [
                    { allowedRoles: { $exists: false } },
                    { allowedRoles: { $size: 0 } },
                    { allowedRoles: req.user.role },
                ],
            };
        }

        const [total, templates] = await Promise.all([
            WhatsAppTemplate.countDocuments(filter),
            WhatsAppTemplate.find(filter)
                .sort({ isDefault: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("createdBy", "name role")
                .populate("defaultPackageIds", "name duration price renewalDiscountPercent"),
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
        if (updates.introTextAr != null) updates.introTextAr = String(updates.introTextAr).trim();
        if (updates.bodyTextAr != null) updates.bodyTextAr = String(updates.bodyTextAr).trim();
        if (updates.defaultPackageIds != null) {
            updates.defaultPackageIds = normalizePackageIds(updates.defaultPackageIds);
        }
        if (updates.allowedRoles != null) {
            updates.allowedRoles = normalizeAllowedRoles(updates.allowedRoles);
        }
        if (updates.defaultDiscountPercent != null) {
            updates.defaultDiscountPercent = Math.min(
                100,
                Math.max(0, Number(updates.defaultDiscountPercent) || 0)
            );
        }

        const nextType = updates.type;
        if (nextType != null) {
            const isBuiltin = nextType === "packages" || nextType === "discounts";
            if (!isBuiltin) {
                updates.includeLiveData = false;
                updates.defaultPackageIds = [];
                updates.defaultDiscountPercent = 0;
            }
        }

        if (updates.isDefault === true || updates.isDefault === "true") {
            updates.isDefault = true;
            const existing = await WhatsAppTemplate.findById(req.params.id).select("type");
            if (!existing) return res.status(404).json({ message: "Template not found" });
            await clearOtherDefaults(nextType || existing.type, existing._id);
        } else if (updates.isDefault === false || updates.isDefault === "false") {
            updates.isDefault = false;
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
            { isActive: false, isDefault: false },
            { new: true }
        );
        if (!template) return res.status(404).json({ message: "Template not found" });
        res.status(200).json({ message: "Template deactivated" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const logTemplateSend = async (req, res) => {
    try {
        const { memberId, memberName, templateId } = req.body;
        const template = templateId
            ? await WhatsAppTemplate.findById(templateId).select("name type")
            : null;

        await writeAudit({
            action: "whatsapp_template_sent",
            actor: req.user.id,
            actorRole: req.user.role,
            targetType: "member",
            targetId: memberId != null ? String(memberId) : null,
            meta: {
                memberName: memberName || null,
                templateId: template?._id?.toString() || templateId || null,
                templateName: template?.name || null,
                templateType: template?.type || null,
            },
            req,
        });

        res.status(200).json({ message: "Logged" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createTemplate,
    getTemplates,
    updateTemplate,
    deleteTemplate,
    logTemplateSend,
    ensureStarterTemplates,
};
