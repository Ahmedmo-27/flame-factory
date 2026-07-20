/**
 * Sales / Sales Manager role functionality tests.
 */

vi.mock("./logger", () => ({
    auth: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    http: vi.fn(),
}));

const authorize = require("../middleware/roleMiddleware");
const { authorizeRoles } = require("../middleware/authMiddleware");
const { resolveAbilities } = require("./userAbilities");
const { redactMemberForViewer, isAssignedToRep } = require("./memberPrivacy");
const {
    SALES_CAPABILITIES,
    SALES_MANAGER_ONLY,
    SALES_DENIED,
    isRoleAllowed,
    salesCan,
    salesManagerCan,
    isValidSalesAssigneeRole,
    buildSalesMemberListScope,
    canAddSalesNote,
    validateSalesRequestCreate,
    applySalesRequestDecision,
    validateSalesTargetUpdate,
    canAccessSalesSensitiveUpload,
} = require("./salesRoleAccess");

function invoke(mw, role) {
    const req = { user: { role, id: "test-user" }, originalUrl: "/api/test" };
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
    };
    const next = vi.fn();
    mw(req, res, next);
    return { req, res, next };
}

function makeMember(overrides = {}) {
    return {
        _id: "m1",
        name: "Nour",
        phones: ["01011112222"],
        nationalId: "29901011234567",
        assignedSales: null,
        userlog: [],
        ...overrides,
    };
}

describe("Sales role — access matrix", () => {
    it("includes Sales on every SALES_CAPABILITIES entry", () => {
        for (const [id, cap] of Object.entries(SALES_CAPABILITIES)) {
            expect(salesCan(id)).toBe(true);
            expect(cap.roles).toContain("Sales");
        }
    });

    it("excludes Sales from every SALES_MANAGER_ONLY entry", () => {
        for (const [id, cap] of Object.entries(SALES_MANAGER_ONLY)) {
            expect(cap.roles).not.toContain("Sales");
            expect(salesManagerCan(id)).toBe(true);
        }
    });

    it("marks Sales-only create request / revenue / my-subscriptions", () => {
        for (const id of ["createSalesRequest", "salesRevenue", "mySubscriptions"]) {
            expect(SALES_CAPABILITIES[id].roles).toEqual(["Sales"]);
            expect(isRoleAllowed("Sales Manager", SALES_CAPABILITIES[id].roles)).toBe(false);
        }
    });
});

describe("Sales role — middleware allows Sales", () => {
    const samples = [
        "memberWrite",
        "memberNotes",
        "freeze",
        "checkin",
        "addAlert",
        "createSalesRequest",
        "salesRevenue",
        "salesRequestsList",
        "notifications",
        "todayCheckins",
    ];

    it.each(samples)("authorize allows Sales for %s", (id) => {
        const { next, res } = invoke(authorize(...SALES_CAPABILITIES[id].roles), "Sales");
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
});

describe("Sales role — middleware denies Sales on manager-only routes", () => {
    const samples = [
        "salesRequestStatus",
        "blockMember",
        "unblockMember",
        "updateTarget",
        "updateAbilities",
        "updatePhonePrivacy",
        "salesManagerRevenue",
        "createPackage",
        "bulkTransferSales",
        "createStaff",
        "allNotes",
    ];

    it.each(samples)("authorize denies Sales for %s", (id) => {
        const { next, res } = invoke(authorize(...SALES_MANAGER_ONLY[id].roles), "Sales");
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it.each(samples)("authorizeRoles allows Sales Manager for %s", (id) => {
        const { next } = invoke(authorizeRoles(...SALES_MANAGER_ONLY[id].roles), "Sales Manager");
        expect(next).toHaveBeenCalled();
    });
});

describe("Sales role — Sales-only endpoints deny Sales Manager", () => {
    const salesOnly = ["createSalesRequest", "salesRevenue", "mySubscriptions"];

    it.each(salesOnly)("%s allows Sales and denies Sales Manager", (id) => {
        const roles = SALES_CAPABILITIES[id].roles;
        const allow = invoke(authorizeRoles(...roles), "Sales");
        const deny = invoke(authorizeRoles(...roles), "Sales Manager");
        expect(allow.next).toHaveBeenCalled();
        expect(deny.next).not.toHaveBeenCalled();
        expect(deny.res.status).toHaveBeenCalledWith(403);
    });
});

describe("Sales role — denied on ops/finance", () => {
    const samples = [
        "assignPackage",
        "refundPackage",
        "refundPT",
        "contracts",
        "registerUser",
        "ptCheckin",
        "createCoachRequest",
        "listPackageExceptions",
    ];

    it.each(samples)("denies Sales for %s", (id) => {
        expect(isRoleAllowed("Sales", SALES_DENIED[id].roles)).toBe(false);
        const { next, res } = invoke(authorize(...SALES_DENIED[id].roles), "Sales");
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });
});

describe("Sales role — abilities & notes", () => {
    it("resolveAbilities defaults true when unset", () => {
        expect(resolveAbilities({})).toEqual({
            canCommentOnMembers: true,
            canRequestAssignment: true,
            canRequestTakeover: true,
        });
    });

    it("gates Sales comments; Manager/Owner always allowed", () => {
        expect(canAddSalesNote("Sales", { canCommentOnMembers: true })).toBe(true);
        expect(canAddSalesNote("Sales", { canCommentOnMembers: false })).toBe(false);
        expect(canAddSalesNote("Sales Manager", { canCommentOnMembers: false })).toBe(true);
        expect(canAddSalesNote("Owner", { canCommentOnMembers: false })).toBe(true);
    });
});

describe("Sales role — request create / approve", () => {
    it("allows assignment and takeover with abilities", () => {
        expect(
            validateSalesRequestCreate({
                member: makeMember(),
                salesUserId: "s1",
                abilities: resolveAbilities({}),
            })
        ).toMatchObject({ ok: true, kind: "assignment" });

        expect(
            validateSalesRequestCreate({
                member: makeMember({ assignedSales: "other" }),
                salesUserId: "s1",
                abilities: resolveAbilities({}),
            })
        ).toMatchObject({ ok: true, kind: "takeover" });
    });

    it("blocks by ability, self-assign, and pending request", () => {
        expect(
            validateSalesRequestCreate({
                member: makeMember(),
                salesUserId: "s1",
                abilities: { canRequestAssignment: false, canRequestTakeover: true },
            }).status
        ).toBe(403);

        expect(
            validateSalesRequestCreate({
                member: makeMember({ assignedSales: "other" }),
                salesUserId: "s1",
                abilities: { canRequestAssignment: true, canRequestTakeover: false },
            }).status
        ).toBe(403);

        expect(
            validateSalesRequestCreate({
                member: makeMember({ assignedSales: "s1" }),
                salesUserId: "s1",
                abilities: resolveAbilities({}),
            }).ok
        ).toBe(false);

        expect(
            validateSalesRequestCreate({
                member: makeMember(),
                salesUserId: "s1",
                abilities: resolveAbilities({}),
                hasPendingRequest: true,
            }).message
        ).toMatch(/pending/i);
    });

    it("approves pending request and assigns member", () => {
        const member = makeMember();
        const request = { status: "pending", requestedBy: "s1", member };
        const result = applySalesRequestDecision(request, "accepted", "mgr");
        expect(result.ok).toBe(true);
        expect(member.assignedSales).toBe("s1");
        expect(result.sideEffects).toContain("assign");
        expect(applySalesRequestDecision(request, "rejected", "mgr").ok).toBe(false);
    });
});

describe("Sales role — list scope, privacy, targets, uploads", () => {
    it("forces Sales member list scope to self", () => {
        expect(buildSalesMemberListScope("Sales", "sales-1", "other")).toBe("sales-1");
        expect(buildSalesMemberListScope("Sales Manager", "mgr", "sales-2")).toBe("sales-2");
    });

    it("redacts phones for Sales on unassigned / privacy-off members", () => {
        const assigned = makeMember({ assignedSales: "s1", phones: ["011"] });
        const other = makeMember({ assignedSales: "s2", phones: ["012"] });

        expect(isAssignedToRep(assigned, "s1")).toBe(true);
        expect(
            redactMemberForViewer(assigned, { role: "Sales", id: "s1", canViewPhones: true }).phones
        ).toEqual(["011"]);
        expect(
            redactMemberForViewer(other, { role: "Sales", id: "s1", canViewPhones: true }).phones
        ).toBeNull();

        const hidden = redactMemberForViewer(assigned, {
            role: "Sales",
            id: "s1",
            canViewPhones: false,
        });
        expect(hidden.phones).toBe("hidden");
        expect(hidden.nationalId).toBeNull();

        expect(
            redactMemberForViewer(other, { role: "Sales Manager", id: "mgr" }).phones
        ).toEqual(["012"]);
    });

    it("validates sales targets and assignee roles", () => {
        expect(
            validateSalesTargetUpdate({
                actorRole: "Sales Manager",
                targetRole: "Sales",
                monthlyTarget: 1000,
            })
        ).toMatchObject({ ok: true, monthlyTarget: 1000 });

        expect(
            validateSalesTargetUpdate({
                actorRole: "Sales",
                targetRole: "Sales",
                monthlyTarget: 100,
            }).ok
        ).toBe(false);

        expect(
            validateSalesTargetUpdate({
                actorRole: "Sales Manager",
                targetRole: "Sales",
                monthlyTarget: -5,
            }).ok
        ).toBe(false);

        expect(isValidSalesAssigneeRole("Sales")).toBe(true);
        expect(isValidSalesAssigneeRole("Sales Manager")).toBe(true);
        expect(isValidSalesAssigneeRole("Coach")).toBe(false);
    });

    it("gates sensitive uploads for Sales by assignment", () => {
        const member = makeMember({ assignedSales: "s1" });
        expect(canAccessSalesSensitiveUpload({ role: "Sales", id: "s1" }, member)).toBe(true);
        expect(canAccessSalesSensitiveUpload({ role: "Sales", id: "s2" }, member)).toBe(false);
        expect(canAccessSalesSensitiveUpload({ role: "Sales Manager", id: "mgr" }, member)).toBe(
            true
        );
    });
});
