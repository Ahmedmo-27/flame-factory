const { z } = require("zod");
const { sanitizePlainText } = require("../utils/sanitizeText");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const emptyToNull = (v) => (v === "" || v === undefined ? null : v);
const nullableObjectId = z.preprocess(emptyToNull, objectId.nullable().optional());

const plainText = (maxLen) =>
    z.string()
        .trim()
        .min(1)
        .max(maxLen)
        .transform(sanitizePlainText)
        .refine((val) => val.length >= 1, "Text is required");

const activityType = z.enum([
    "gym", "crossfit", "box", "mma", "kickboxing", "calisthenics",
]);
const duration = z.enum(["1 month", "3 months", "6 months", "1 year"]);
const memberSource = z.enum([
    "Social media", "Walk in", "Word of mouth", "referral", "sales call", "data entry", "others",
]);

const loginSchema = z.object({
    email: z.string().trim().email().max(200),
    password: z.string().min(1).max(200),
});

const createMemberSchema = z.object({
    name: z.string().trim().min(1).max(120),
    phones: z.string().trim().min(5).max(40),
    nationalId: z.preprocess(emptyToNull, z.string().trim().max(40).nullable().optional()),
    // photo is intentionally omitted — only set via PATCH /members/:id/photo
    gender: z.preprocess(emptyToNull, z.enum(["male", "female"]).nullable().optional()),
    birthdate: z.preprocess(emptyToNull, z.string().max(40).nullable().optional()),
    source: z.preprocess(emptyToNull, memberSource.nullable().optional()),
    packageId: nullableObjectId,
    assignedSales: nullableObjectId,
});

const freezeMemberSchema = z.object({
    startDate: z.string().min(1),
    endDate: z.string().min(1),
});

const addNoteSchema = z.object({
    text: plainText(2000),
});

const addAlertSchema = z.object({
    text: plainText(2000),
});

const invitationSchema = z.object({
    invitedName: z.string().trim().min(1).max(120),
    invitedPhone: z
        .string()
        .trim()
        .max(40)
        .optional()
        .transform((v) => (v && v.length ? v : null)),
});

const assignPackageSchema = z.object({
    packageId: objectId,
    name: z.string().trim().min(1).max(120),
    activityType: activityType.optional(),
    duration,
    price: z.coerce.number().nonnegative().optional(),
    freezeLimitDays: z.coerce.number().int().nonnegative().optional(),
    invitationLimit: z.coerce.number().int().nonnegative().optional(),
    renewalDiscountPercent: z.coerce.number().min(0).max(100).optional(),
    pricePaid: z.coerce.number().positive("Price paid must be greater than zero"),
    discountPercent: z.coerce.number().min(0).max(100).optional(),
    startDate: z.string().max(40).nullable().optional(),
});

const createExceptionSchema = z.object({
    memberId: z.union([objectId, z.string().trim().min(1).max(40)]),
    basePackageId: objectId,
    hasException: z.preprocess(
        (v) => v === true || v === "true" || v === 1 || v === "1",
        z.boolean()
    ).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    activityType: activityType.optional(),
    duration: duration.optional(),
    price: z.coerce.number().nonnegative().optional(),
    freezeLimitDays: z.coerce.number().int().nonnegative().optional(),
    invitationLimit: z.coerce.number().int().nonnegative().optional(),
    renewalDiscountPercent: z.coerce.number().min(0).max(100).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    pricePaid: z.coerce.number().nonnegative().optional(),
    discountPercent: z.coerce.number().min(0).max(100).optional(),
    startDate: z.string().max(40).nullable().optional(),
    reason: z.string().trim().max(1000).nullable().optional(),
});

const exceptionStatusSchema = z.object({
    status: z.enum(["accepted", "rejected"]),
    reviewNote: z.string().trim().max(500).nullable().optional(),
});

const salesRequestSchema = z.object({
    memberId: z.union([objectId, z.string().trim().min(1).max(40)]),
});

const salesRequestStatusSchema = z.object({
    status: z.enum(["accepted", "rejected"]),
});

const createStaffSchema = z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(200),
    password: z.string().min(8).max(200),
    role: z.enum(["Sales", "Receptionist", "Accountant"]),
});

const createPackageSchema = z.object({
    name: z.string().trim().min(1).max(120),
    activityType,
    duration,
    price: z.coerce.number().nonnegative(),
    freezeLimitDays: z.coerce.number().int().nonnegative().optional(),
    invitationLimit: z.coerce.number().int().nonnegative().optional(),
    renewalDiscountPercent: z.coerce.number().min(0).max(100).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
});

const updatePackageSchema = createPackageSchema.partial().extend({
    isActive: z.boolean().optional(),
});

module.exports = {
    loginSchema,
    createMemberSchema,
    freezeMemberSchema,
    addNoteSchema,
    addAlertSchema,
    invitationSchema,
    assignPackageSchema,
    createExceptionSchema,
    exceptionStatusSchema,
    salesRequestSchema,
    salesRequestStatusSchema,
    createStaffSchema,
    createPackageSchema,
    updatePackageSchema,
};
