/**
 * Coach / Coach Manager role functionality tests.
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
const { redactMemberForViewer } = require("./memberPrivacy");
const {
    COACH_CAPABILITIES,
    COACH_MANAGER_ONLY,
    COACH_DENIED,
    isRoleAllowed,
    coachCan,
    coachManagerCan,
    isValidCoachAssigneeRole,
    canAddCouchNote,
    validateCoachRequestCreate,
    applyCoachRequestDecision,
    coachPTCheckIn,
    coachManagerPTCheckIn,
    filterTodayTransfersForRole,
} = require("./coachRoleAccess");

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
        name: "Karim",
        phones: ["01000000000"],
        current_couch: null,
        couch_subscription_status: "active",
        PT_sessions: 8,
        used_PT_sessions: 0,
        userlog: [],
        ...overrides,
    };
}

describe("Coach role — access matrix", () => {
    it("includes Coach on every COACH_CAPABILITIES entry", () => {
        for (const [id, cap] of Object.entries(COACH_CAPABILITIES)) {
            expect(coachCan(id)).toBe(true);
            expect(cap.roles).toContain("Coach");
        }
    });

    it("excludes Coach from every COACH_MANAGER_ONLY entry", () => {
        for (const [id, cap] of Object.entries(COACH_MANAGER_ONLY)) {
            expect(cap.roles).not.toContain("Coach");
            expect(coachManagerCan(id)).toBe(true);
        }
    });

    it("createCoachRequest is Coach-only among coach roles", () => {
        const roles = COACH_CAPABILITIES.createCoachRequest.roles;
        expect(roles).toEqual(["Coach"]);
        expect(isRoleAllowed("Coach Manager", roles)).toBe(false);
    });
});

describe("Coach role — middleware allows Coach", () => {
    const samples = [
        "ptCheckin",
        "couchNotes",
        "todayCoachTransfers",
        "createCoachRequest",
        "coachRequestsList",
        "notifications",
        "memberProfile",
        "membersAll",
    ];

    it.each(samples)("authorize allows Coach for %s", (id) => {
        const { next, res } = invoke(authorize(...COACH_CAPABILITIES[id].roles), "Coach");
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
});

describe("Coach role — middleware denies Coach on manager-only routes", () => {
    const samples = [
        "assignCoach",
        "switchCoach",
        "bulkTransferCoach",
        "coachRequestStatus",
        "updateCoachAbilities",
        "coachTeam",
        "allNotes",
        "uploadsSensitive",
    ];

    it.each(samples)("authorize denies Coach for %s", (id) => {
        const { next, res } = invoke(authorize(...COACH_MANAGER_ONLY[id].roles), "Coach");
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it.each(samples)("authorizeRoles allows Coach Manager for %s", (id) => {
        const { next } = invoke(authorizeRoles(...COACH_MANAGER_ONLY[id].roles), "Coach Manager");
        expect(next).toHaveBeenCalled();
    });
});

describe("Coach role — denied on ops/finance", () => {
    const samples = [
        "salesManagerRevenue",
        "createPackage",
        "assignPackage",
        "refundPackage",
        "refundPT",
        "contracts",
        "blockMember",
        "memberWrite",
        "registerUser",
    ];

    it.each(samples)("denies Coach for %s", (id) => {
        expect(isRoleAllowed("Coach", COACH_DENIED[id].roles)).toBe(false);
        const { next, res } = invoke(authorize(...COACH_DENIED[id].roles), "Coach");
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });
});

describe("Coach role — abilities & couch notes", () => {
    it("resolveAbilities defaults true when unset", () => {
        expect(resolveAbilities({})).toEqual({
            canCommentOnMembers: true,
            canRequestAssignment: true,
            canRequestTakeover: true,
        });
    });

    it("gates Coach comments; Manager always allowed", () => {
        expect(canAddCouchNote("Coach", { canCommentOnMembers: true })).toBe(true);
        expect(canAddCouchNote("Coach", { canCommentOnMembers: false })).toBe(false);
        expect(canAddCouchNote("Coach Manager", { canCommentOnMembers: false })).toBe(true);
    });
});

describe("Coach role — request create / approve", () => {
    it("allows assignment and takeover with abilities", () => {
        expect(
            validateCoachRequestCreate({
                member: makeMember(),
                coachUserId: "c1",
                abilities: resolveAbilities({}),
            })
        ).toMatchObject({ ok: true, kind: "assignment" });

        expect(
            validateCoachRequestCreate({
                member: makeMember({ current_couch: "other" }),
                coachUserId: "c1",
                abilities: resolveAbilities({}),
            })
        ).toMatchObject({ ok: true, kind: "takeover" });
    });

    it("blocks by ability, self-assign, and pending request", () => {
        expect(
            validateCoachRequestCreate({
                member: makeMember(),
                coachUserId: "c1",
                abilities: { canRequestAssignment: false, canRequestTakeover: true },
            }).status
        ).toBe(403);

        expect(
            validateCoachRequestCreate({
                member: makeMember({ current_couch: "other" }),
                coachUserId: "c1",
                abilities: { canRequestAssignment: true, canRequestTakeover: false },
            }).status
        ).toBe(403);

        expect(
            validateCoachRequestCreate({
                member: makeMember({ current_couch: "c1" }),
                coachUserId: "c1",
                abilities: resolveAbilities({}),
            }).ok
        ).toBe(false);

        expect(
            validateCoachRequestCreate({
                member: makeMember(),
                coachUserId: "c1",
                abilities: resolveAbilities({}),
                hasPendingRequest: true,
            }).message
        ).toMatch(/pending/i);
    });

    it("approves pending request and assigns member", () => {
        const member = makeMember();
        const request = { status: "pending", requestedBy: "c1", member };
        const result = applyCoachRequestDecision(request, "accepted", "mgr");
        expect(result.ok).toBe(true);
        expect(member.current_couch).toBe("c1");
        expect(result.sideEffects).toContain("assign");
        expect(applyCoachRequestDecision(request, "rejected", "mgr").ok).toBe(false);
    });
});

describe("Coach role — PT check-in", () => {
    it("Coach checks in once per day (+1 session)", () => {
        const member = makeMember({ PT_sessions: 3, used_PT_sessions: 0 });
        expect(coachPTCheckIn(member, "c1", new Date("2026-03-01T10:00:00")).ok).toBe(true);
        expect(member.used_PT_sessions).toBe(1);
        expect(coachPTCheckIn(member, "c1", new Date("2026-03-01T20:00:00")).ok).toBe(false);
        expect(coachPTCheckIn(member, "c1", new Date("2026-03-02T08:00:00")).ok).toBe(true);
        expect(member.used_PT_sessions).toBe(2);
    });

    it("Coach Manager deducts N sessions without once/day guard", () => {
        const member = makeMember({ PT_sessions: 10, used_PT_sessions: 0 });
        expect(coachManagerPTCheckIn(member, 3, "mgr", new Date("2026-03-01T10:00:00")).ok).toBe(
            true
        );
        expect(member.used_PT_sessions).toBe(3);
        expect(coachManagerPTCheckIn(member, 2, "mgr", new Date("2026-03-01T12:00:00")).ok).toBe(
            true
        );
        expect(member.used_PT_sessions).toBe(5);
        expect(coachManagerPTCheckIn(member, 99, "mgr").ok).toBe(false);
    });

    it("rejects inactive members and exhausted sessions", () => {
        expect(
            coachPTCheckIn(makeMember({ couch_subscription_status: "inactive" }), "c1").ok
        ).toBe(false);
        expect(
            coachPTCheckIn(makeMember({ PT_sessions: 2, used_PT_sessions: 2 }), "c1").ok
        ).toBe(false);
    });
});

describe("Coach role — transfers, assignee, privacy", () => {
    it("scopes today's transfers for Coach", () => {
        const rows = [
            { current_couch: "c1" },
            { current_couch: "c2" },
            { current_couch: "c1" },
        ];
        expect(filterTodayTransfersForRole(rows, "Coach", "c1")).toHaveLength(2);
        expect(filterTodayTransfersForRole(rows, "Coach Manager", "mgr")).toHaveLength(3);
    });

    it("validates coach assignee roles", () => {
        expect(isValidCoachAssigneeRole("Coach")).toBe(true);
        expect(isValidCoachAssigneeRole("Coach Manager")).toBe(true);
        expect(isValidCoachAssigneeRole("Sales")).toBe(false);
        expect(isValidCoachAssigneeRole("Owner")).toBe(false);
    });

    it("redacts phones for Coach on unassigned members", () => {
        const assigned = makeMember({ current_couch: "c1", phones: ["011"] });
        const other = makeMember({ current_couch: "c2", phones: ["012"] });
        expect(redactMemberForViewer(assigned, { role: "Coach", id: "c1" }).phones).toEqual([
            "011",
        ]);
        expect(redactMemberForViewer(other, { role: "Coach", id: "c1" }).phones).toBeNull();
        expect(
            redactMemberForViewer(other, { role: "Coach Manager", id: "mgr" }).phones
        ).toEqual(["012"]);
    });
});
