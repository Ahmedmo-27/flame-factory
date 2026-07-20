#!/usr/bin/env node
/**
 * Runnable multi-scenario simulation of Coach / Coach Manager role access
 * and Coach business rules (PT check-in, notes, requests).
 *
 * Scenarios:
 *  1) Coach allowed capabilities (middleware)
 *  2) Coach Manager-only capabilities deny Coach
 *  3) Coach denied on sales/ops/finance routes
 *  4) Coach-only create request; Manager approves
 *  5) Ability gates (comment / assignment / takeover)
 *  6) PT check-in: Coach once/day +1 vs Manager multi-session
 *  7) Transfers scoping + assignee role validation
 *
 * Run: node scripts/simulate-coach-role-scenarios.js
 *  or: npm run simulate:coach-role
 */

const authorize = require("../src/middleware/roleMiddleware");
const { authorizeRoles } = require("../src/middleware/authMiddleware");
const { resolveAbilities } = require("../src/utils/userAbilities");
const { redactMemberForViewer } = require("../src/utils/memberPrivacy");
const {
    COACH_CAPABILITIES,
    COACH_MANAGER_ONLY,
    COACH_DENIED,
    isRoleAllowed,
    coachCan,
    isValidCoachAssigneeRole,
    canAddCouchNote,
    validateCoachRequestCreate,
    applyCoachRequestDecision,
    coachPTCheckIn,
    coachManagerPTCheckIn,
    filterTodayTransfersForRole,
} = require("../src/utils/coachRoleAccess");

// Quiet auth middleware warn noise during simulation
const logger = require("../src/utils/logger");
logger.auth = () => {};

function line(title) {
    console.log(`\n=== ${title} ===`);
}

function assert(condition, message) {
    if (!condition) {
        console.error(`\nFAIL: ${message}`);
        process.exit(1);
    }
}

function runMiddleware(mw, role) {
    const req = { user: { role, id: "u1" }, originalUrl: "/test" };
    const res = {
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        },
    };
    let nextCalled = false;
    mw(req, res, () => {
        nextCalled = true;
    });
    return { nextCalled, status: res.statusCode, body: res.body };
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
        couch_notes: [],
        ...overrides,
    };
}

function main() {
    let passed = 0;

    // ------------------------------------------------------------------
    line("1) Coach allowed capabilities");
    {
        const samples = [
            "ptCheckin",
            "couchNotes",
            "todayCoachTransfers",
            "createCoachRequest",
            "coachRequestsList",
            "notifications",
            "memberProfile",
        ];
        for (const id of samples) {
            assert(coachCan(id), `Coach must access ${id}`);
            const result = runMiddleware(authorize(...COACH_CAPABILITIES[id].roles), "Coach");
            assert(result.nextCalled, `middleware allows Coach for ${id}`);
        }
        console.log(`Coach allowed samples OK (${samples.length})`);
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("2) Coach Manager-only — Coach denied, Manager allowed");
    {
        const samples = [
            "assignCoach",
            "switchCoach",
            "bulkTransferCoach",
            "coachRequestStatus",
            "updateCoachAbilities",
            "coachTeam",
            "uploadsSensitive",
        ];
        for (const id of samples) {
            const roles = COACH_MANAGER_ONLY[id].roles;
            assert(!isRoleAllowed("Coach", roles), `Coach denied ${id}`);
            assert(isRoleAllowed("Coach Manager", roles), `Coach Manager allowed ${id}`);
            const deny = runMiddleware(authorize(...roles), "Coach");
            const allow = runMiddleware(authorizeRoles(...roles), "Coach Manager");
            assert(!deny.nextCalled && deny.status === 403, `middleware denies Coach for ${id}`);
            assert(allow.nextCalled, `middleware allows Coach Manager for ${id}`);
        }
        console.log(`Coach Manager-only samples OK (${samples.length})`);
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("3) Coach denied on sales / ops / finance routes");
    {
        const samples = [
            "salesManagerRevenue",
            "createPackage",
            "assignPackage",
            "refundPackage",
            "contracts",
            "blockMember",
            "memberWrite",
            "registerUser",
        ];
        for (const id of samples) {
            const roles = COACH_DENIED[id].roles;
            assert(!isRoleAllowed("Coach", roles), `Coach denied ${id}`);
            const result = runMiddleware(authorize(...roles), "Coach");
            assert(!result.nextCalled && result.status === 403, `middleware denies Coach for ${id}`);
        }
        console.log(`Coach finance/ops denials OK (${samples.length})`);
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("4) Coach creates request; Coach Manager approves");
    {
        // Coach can create; Manager cannot (middleware)
        assert(isRoleAllowed("Coach", COACH_CAPABILITIES.createCoachRequest.roles), "Coach creates");
        assert(
            !isRoleAllowed("Coach Manager", COACH_CAPABILITIES.createCoachRequest.roles),
            "Manager cannot create"
        );

        const member = makeMember();
        const create = validateCoachRequestCreate({
            member,
            coachUserId: "coach-1",
            abilities: resolveAbilities({}),
        });
        assert(create.ok && create.kind === "assignment", "assignment request OK");

        const request = {
            status: "pending",
            requestedBy: "coach-1",
            member,
        };
        const approved = applyCoachRequestDecision(request, "accepted", "mgr-1");
        assert(approved.ok, "approve OK");
        assert(member.current_couch === "coach-1", "member assigned to requester");
        assert(approved.sideEffects.includes("assign"), "assign side effect");

        const again = applyCoachRequestDecision(request, "rejected", "mgr-1");
        assert(!again.ok, "already processed rejected");
        console.log("Request create → approve flow OK");
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("5) Ability gates — comment / assignment / takeover");
    {
        assert(canAddCouchNote("Coach", { canCommentOnMembers: true }), "comment allowed");
        assert(!canAddCouchNote("Coach", { canCommentOnMembers: false }), "comment blocked");
        assert(canAddCouchNote("Coach Manager", { canCommentOnMembers: false }), "manager bypass");

        const free = makeMember();
        const blockedAssign = validateCoachRequestCreate({
            member: free,
            coachUserId: "c1",
            abilities: { canRequestAssignment: false, canRequestTakeover: true },
        });
        assert(!blockedAssign.ok && blockedAssign.status === 403, "assignment ability blocks");

        const taken = makeMember({ current_couch: "other" });
        const blockedTakeover = validateCoachRequestCreate({
            member: taken,
            coachUserId: "c1",
            abilities: { canRequestAssignment: true, canRequestTakeover: false },
        });
        assert(!blockedTakeover.ok && blockedTakeover.status === 403, "takeover ability blocks");

        const self = makeMember({ current_couch: "c1" });
        const selfReq = validateCoachRequestCreate({
            member: self,
            coachUserId: "c1",
            abilities: resolveAbilities({}),
        });
        assert(!selfReq.ok, "cannot request self-assigned member");
        console.log("Ability gates OK");
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("6) PT check-in — Coach once/day vs Manager multi-session");
    {
        const member = makeMember({ PT_sessions: 5, used_PT_sessions: 0 });
        const first = coachPTCheckIn(member, "coach-1", new Date("2026-03-01T10:00:00"));
        assert(first.ok && member.used_PT_sessions === 1, "Coach first check-in");

        const second = coachPTCheckIn(member, "coach-1", new Date("2026-03-01T18:00:00"));
        assert(!second.ok && second.message.includes("already"), "Coach blocked same day");

        const nextDay = coachPTCheckIn(member, "coach-1", new Date("2026-03-02T09:00:00"));
        assert(nextDay.ok && member.used_PT_sessions === 2, "Coach next day OK");

        const mgrMember = makeMember({ PT_sessions: 10, used_PT_sessions: 1 });
        const multi = coachManagerPTCheckIn(mgrMember, 3, "mgr-1", new Date("2026-03-01T10:00:00"));
        assert(multi.ok && mgrMember.used_PT_sessions === 4, "Manager deducts 3");

        // Manager can check in again same day
        const multi2 = coachManagerPTCheckIn(mgrMember, 2, "mgr-1", new Date("2026-03-01T12:00:00"));
        assert(multi2.ok && mgrMember.used_PT_sessions === 6, "Manager no once/day guard");

        const tooMany = coachManagerPTCheckIn(mgrMember, 99, "mgr-1");
        assert(!tooMany.ok, "Manager over remaining rejected");

        const inactive = makeMember({ couch_subscription_status: "inactive" });
        assert(!coachPTCheckIn(inactive, "c1").ok, "inactive blocked for Coach");
        console.log("PT check-in rules OK");
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("7) Transfers scoping, assignee validation, phone privacy");
    {
        const transfers = [
            { name: "A", current_couch: "coach-1" },
            { name: "B", current_couch: "coach-2" },
            { name: "C", current_couch: "coach-1" },
        ];
        const scoped = filterTodayTransfersForRole(transfers, "Coach", "coach-1");
        assert(scoped.length === 2, "Coach sees only own transfers");
        assert(
            filterTodayTransfersForRole(transfers, "Coach Manager", "mgr-1").length === 3,
            "Manager sees all"
        );

        assert(isValidCoachAssigneeRole("Coach"), "Coach valid assignee");
        assert(isValidCoachAssigneeRole("Coach Manager"), "Coach Manager valid assignee");
        assert(!isValidCoachAssigneeRole("Sales"), "Sales invalid assignee");

        const assigned = makeMember({ current_couch: "coach-1", phones: ["011"] });
        const other = makeMember({ current_couch: "coach-2", phones: ["012"] });
        const viewer = { role: "Coach", id: "coach-1" };
        assert(
            redactMemberForViewer(assigned, viewer).phones[0] === "011",
            "assigned keeps phones"
        );
        assert(redactMemberForViewer(other, viewer).phones === null, "unassigned phones redacted");
        assert(
            redactMemberForViewer(other, { role: "Coach Manager", id: "mgr" }).phones[0] === "012",
            "Manager keeps phones"
        );
        console.log("Scoping / assignee / privacy OK");
        passed += 1;
    }

    console.log(`\nOK — ${passed}/7 coach role scenarios passed.\n`);
}

main();
