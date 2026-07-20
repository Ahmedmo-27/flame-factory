/**
 * Owner role functionality tests — access matrix, middleware gates, role change.
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
const {
    ALL_ROLES,
    CAPABILITIES,
    OWNER_DENIED_CAPABILITIES,
    isRoleAllowed,
    ownerCan,
    ownerDenied,
    validateRoleChange,
    applyRoleChange,
    assertOwnerTeamsPageAccess,
    listOwnerAllowedCapabilityIds,
    listOwnerDeniedCapabilityIds,
} = require("./ownerRoleAccess");

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

describe("Owner role — access matrix", () => {
    it("lists Owner as allowed on every CAPABILITIES entry", () => {
        const allowed = listOwnerAllowedCapabilityIds();
        expect(allowed.length).toBe(Object.keys(CAPABILITIES).length);
        for (const id of allowed) {
            expect(ownerCan(id)).toBe(true);
            expect(CAPABILITIES[id].roles).toContain("Owner");
        }
    });

    it("marks exclusive capabilities as Owner-denied", () => {
        const denied = listOwnerDeniedCapabilityIds();
        expect(denied.length).toBe(Object.keys(OWNER_DENIED_CAPABILITIES).length);
        for (const id of denied) {
            expect(ownerDenied(id)).toBe(true);
            expect(OWNER_DENIED_CAPABILITIES[id].roles).not.toContain("Owner");
        }
    });

    it("Owner-only capabilities are exactly register, changeRole, allTeams", () => {
        const ownerOnly = Object.entries(CAPABILITIES)
            .filter(([, cap]) => cap.roles.length === 1 && cap.roles[0] === "Owner")
            .map(([id]) => id)
            .sort();
        expect(ownerOnly).toEqual(["allTeams", "changeRole", "registerUser"]);
    });
});

describe("Owner role — middleware allows Owner on shared routes", () => {
    const samples = [
        "salesManagerRevenue",
        "assignPackage",
        "refundPackage",
        "refundPT",
        "createPackage",
        "deletePackage",
        "contracts",
        "salesRequestStatus",
        "coachRequestStatus",
        "bulkTransferSales",
        "bulkTransferCoach",
        "createStaff",
        "memberWrite",
        "uploads",
    ];

    it.each(samples)("authorize allows Owner for %s", (id) => {
        const { next, res } = invoke(authorize(...CAPABILITIES[id].roles), "Owner");
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it.each(samples)("authorizeRoles allows Owner for %s", (id) => {
        const { next, res } = invoke(authorizeRoles(...CAPABILITIES[id].roles), "Owner");
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
});

describe("Owner role — middleware denies Owner on exclusive routes", () => {
    const samples = [
        "salesRevenue",
        "updateTarget",
        "updateAbilities",
        "updatePhonePrivacy",
        "blockMember",
        "addAlert",
        "uploadNationalId",
        "ptCheckin",
        "listPackageExceptions",
        "notifications",
        "createSalesRequest",
        "createCoachRequest",
    ];

    it.each(samples)("authorize denies Owner for %s", (id) => {
        const { next, res } = invoke(authorize(...OWNER_DENIED_CAPABILITIES[id].roles), "Owner");
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });
});

describe("Owner role — Owner-only routes deny other roles", () => {
    const ownerOnlyIds = ["registerUser", "changeRole", "allTeams"];
    const otherRoles = ALL_ROLES.filter((r) => r !== "Owner");

    it.each(ownerOnlyIds)("%s allows only Owner", (id) => {
        const roles = CAPABILITIES[id].roles;
        const allow = invoke(authorizeRoles(...roles), "Owner");
        expect(allow.next).toHaveBeenCalled();

        for (const role of otherRoles) {
            const denied = invoke(authorizeRoles(...roles), role);
            expect(denied.next).not.toHaveBeenCalled();
            expect(denied.res.status).toHaveBeenCalledWith(403);
        }
    });
});

describe("Owner role — changeRole", () => {
    it("accepts every enum role", () => {
        for (const role of ALL_ROLES) {
            expect(validateRoleChange(role)).toEqual({ ok: true });
        }
    });

    it("rejects unknown roles", () => {
        expect(validateRoleChange("SuperAdmin")).toEqual({
            ok: false,
            status: 400,
            message: "invalid type",
        });
        expect(validateRoleChange("owner")).toMatchObject({ ok: false }); // case-sensitive
    });

    it("applies role change and reports missing user", () => {
        const user = { _id: "1", role: "Sales" };
        expect(applyRoleChange(user, "Coach Manager")).toMatchObject({ ok: true });
        expect(user.role).toBe("Coach Manager");

        expect(applyRoleChange(null, "Owner")).toEqual({
            ok: false,
            status: 400,
            message: "user doesnt",
        });

        const unchanged = { role: "Accountant" };
        expect(applyRoleChange(unchanged, "Nope").ok).toBe(false);
        expect(unchanged.role).toBe("Accountant");
    });
});

describe("Owner role — teams page guard", () => {
    it("allows Owner and blocks every other role", () => {
        expect(assertOwnerTeamsPageAccess("Owner")).toEqual({ ok: true });
        for (const role of ALL_ROLES.filter((r) => r !== "Owner")) {
            expect(assertOwnerTeamsPageAccess(role)).toEqual({
                ok: false,
                status: 403,
                message: "Only the owner can view this page",
            });
        }
    });
});

describe("Owner role — isRoleAllowed helper", () => {
    it("matches middleware membership semantics", () => {
        expect(isRoleAllowed("Owner", ["Owner", "Accountant"])).toBe(true);
        expect(isRoleAllowed("Sales", ["Owner", "Accountant"])).toBe(false);
    });
});
