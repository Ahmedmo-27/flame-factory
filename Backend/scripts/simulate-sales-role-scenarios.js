#!/usr/bin/env node
/**
 * Runnable multi-scenario simulation of Sales / Sales Manager role access
 * and Sales business rules (requests, notes, privacy, scoping, targets).
 *
 * Scenarios:
 *  1) Sales allowed capabilities (middleware)
 *  2) Sales Manager-only capabilities deny Sales
 *  3) Sales-only endpoints deny Sales Manager
 *  4) Sales denied on ops/finance / other exclusives
 *  5) Sales creates request; Manager approves
 *  6) Ability gates + phone privacy + member list scope
 *  7) Targets, assignee validation, sensitive uploads
 *
 * Run: node scripts/simulate-sales-role-scenarios.js
 *  or: npm run simulate:sales-role
 */

const authorize = require("../src/middleware/roleMiddleware");
const { authorizeRoles } = require("../src/middleware/authMiddleware");
const { resolveAbilities } = require("../src/utils/userAbilities");
const { redactMemberForViewer, isAssignedToRep } = require("../src/utils/memberPrivacy");
const {
    SALES_CAPABILITIES,
    SALES_MANAGER_ONLY,
    SALES_DENIED,
    isRoleAllowed,
    salesCan,
    validateSalesRequestCreate,
    applySalesRequestDecision,
    canAddSalesNote,
    buildSalesMemberListScope,
    isValidSalesAssigneeRole,
    validateSalesTargetUpdate,
    canAccessSalesSensitiveUpload,
} = require("../src/utils/salesRoleAccess");

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
        name: "Nour",
        phones: ["01011112222"],
        nationalId: "29901011234567",
        assignedSales: null,
        userlog: [],
        ...overrides,
    };
}

function main() {
    let passed = 0;

    // ------------------------------------------------------------------
    line("1) Sales allowed capabilities");
    {
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
        ];
        for (const id of samples) {
            assert(salesCan(id), `Sales must access ${id}`);
            const result = runMiddleware(authorize(...SALES_CAPABILITIES[id].roles), "Sales");
            assert(result.nextCalled, `middleware allows Sales for ${id}`);
        }
        console.log(`Sales allowed samples OK (${samples.length})`);
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("2) Sales Manager-only — Sales denied, Manager allowed");
    {
        const samples = [
            "salesRequestStatus",
            "blockMember",
            "updateTarget",
            "updateAbilities",
            "updatePhonePrivacy",
            "salesManagerRevenue",
            "createPackage",
            "bulkTransferSales",
            "createStaff",
        ];
        for (const id of samples) {
            const roles = SALES_MANAGER_ONLY[id].roles;
            assert(!isRoleAllowed("Sales", roles), `Sales denied ${id}`);
            assert(isRoleAllowed("Sales Manager", roles), `Sales Manager allowed ${id}`);
            const deny = runMiddleware(authorize(...roles), "Sales");
            const allow = runMiddleware(authorizeRoles(...roles), "Sales Manager");
            assert(!deny.nextCalled && deny.status === 403, `middleware denies Sales for ${id}`);
            assert(allow.nextCalled, `middleware allows Sales Manager for ${id}`);
        }
        console.log(`Sales Manager-only samples OK (${samples.length})`);
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("3) Sales-only endpoints deny Sales Manager");
    {
        const salesOnly = ["createSalesRequest", "salesRevenue", "mySubscriptions"];
        for (const id of salesOnly) {
            const roles = SALES_CAPABILITIES[id].roles;
            assert(roles.length === 1 && roles[0] === "Sales", `${id} must be Sales-only`);
            const allow = runMiddleware(authorizeRoles(...roles), "Sales");
            const deny = runMiddleware(authorizeRoles(...roles), "Sales Manager");
            assert(allow.nextCalled, `Sales allowed ${id}`);
            assert(!deny.nextCalled && deny.status === 403, `Sales Manager denied ${id}`);
        }
        console.log("Sales-only endpoints OK");
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("4) Sales denied on ops/finance / other exclusives");
    {
        const samples = [
            "assignPackage",
            "refundPackage",
            "contracts",
            "registerUser",
            "ptCheckin",
            "createCoachRequest",
            "listPackageExceptions",
        ];
        for (const id of samples) {
            const roles = SALES_DENIED[id].roles;
            assert(!isRoleAllowed("Sales", roles), `Sales denied ${id}`);
            const result = runMiddleware(authorize(...roles), "Sales");
            assert(!result.nextCalled && result.status === 403, `middleware denies Sales for ${id}`);
        }
        console.log(`Sales ops/finance denials OK (${samples.length})`);
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("5) Sales creates request; Sales Manager approves");
    {
        assert(
            isRoleAllowed("Sales", SALES_CAPABILITIES.createSalesRequest.roles),
            "Sales creates"
        );
        assert(
            !isRoleAllowed("Sales Manager", SALES_CAPABILITIES.createSalesRequest.roles),
            "Manager cannot create"
        );

        const member = makeMember();
        const create = validateSalesRequestCreate({
            member,
            salesUserId: "sales-1",
            abilities: resolveAbilities({}),
        });
        assert(create.ok && create.kind === "assignment", "assignment request OK");

        const request = {
            status: "pending",
            requestedBy: "sales-1",
            member,
        };
        const approved = applySalesRequestDecision(request, "accepted", "mgr-1");
        assert(approved.ok, "approve OK");
        assert(member.assignedSales === "sales-1", "member assigned to requester");
        assert(approved.sideEffects.includes("assign"), "assign side effect");

        const again = applySalesRequestDecision(request, "rejected", "mgr-1");
        assert(!again.ok, "already processed rejected");
        console.log("Request create → approve flow OK");
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("6) Ability gates + phone privacy + member list scope");
    {
        assert(canAddSalesNote("Sales", { canCommentOnMembers: true }), "comment allowed");
        assert(!canAddSalesNote("Sales", { canCommentOnMembers: false }), "comment blocked");
        assert(canAddSalesNote("Sales Manager", { canCommentOnMembers: false }), "manager bypass");

        const free = makeMember();
        assert(
            !validateSalesRequestCreate({
                member: free,
                salesUserId: "s1",
                abilities: { canRequestAssignment: false, canRequestTakeover: true },
            }).ok,
            "assignment ability blocks"
        );

        const taken = makeMember({ assignedSales: "other" });
        assert(
            !validateSalesRequestCreate({
                member: taken,
                salesUserId: "s1",
                abilities: { canRequestAssignment: true, canRequestTakeover: false },
            }).ok,
            "takeover ability blocks"
        );

        assert(
            buildSalesMemberListScope("Sales", "sales-1", "someone-else") === "sales-1",
            "Sales list scope forced to self"
        );
        assert(
            buildSalesMemberListScope("Sales Manager", "mgr", "sales-2") === "sales-2",
            "Manager list scope uses query"
        );

        const assigned = makeMember({ assignedSales: "sales-1", phones: ["011"] });
        const other = makeMember({ assignedSales: "sales-2", phones: ["012"] });
        const salesViewer = { role: "Sales", id: "sales-1", canViewPhones: true };
        assert(isAssignedToRep(assigned, "sales-1"), "assigned detection");
        assert(
            redactMemberForViewer(assigned, salesViewer).phones[0] === "011",
            "assigned keeps phones"
        );
        assert(
            redactMemberForViewer(other, salesViewer).phones === null,
            "unassigned phones redacted"
        );

        const hidden = redactMemberForViewer(assigned, {
            role: "Sales",
            id: "sales-1",
            canViewPhones: false,
        });
        assert(hidden.phones === "hidden", "canViewPhones false hides phones");
        assert(hidden.nationalId === null, "canViewPhones false clears nationalId");

        assert(
            redactMemberForViewer(other, { role: "Sales Manager", id: "mgr" }).phones[0] === "012",
            "Manager keeps phones"
        );
        console.log("Abilities / privacy / scope OK");
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("7) Targets, assignee validation, sensitive uploads");
    {
        assert(
            validateSalesTargetUpdate({
                actorRole: "Sales Manager",
                targetRole: "Sales",
                monthlyTarget: 5000,
            }).ok,
            "valid target"
        );
        assert(
            !validateSalesTargetUpdate({
                actorRole: "Sales",
                targetRole: "Sales",
                monthlyTarget: 100,
            }).ok,
            "Sales cannot set targets"
        );
        assert(
            !validateSalesTargetUpdate({
                actorRole: "Sales Manager",
                targetRole: "Coach",
                monthlyTarget: 100,
            }).ok,
            "target must be Sales role"
        );
        assert(
            !validateSalesTargetUpdate({
                actorRole: "Sales Manager",
                targetRole: "Sales",
                monthlyTarget: -1,
            }).ok,
            "negative target rejected"
        );

        assert(isValidSalesAssigneeRole("Sales"), "Sales valid assignee");
        assert(isValidSalesAssigneeRole("Sales Manager"), "Sales Manager valid assignee");
        assert(!isValidSalesAssigneeRole("Coach"), "Coach invalid assignee");

        const member = makeMember({ assignedSales: "sales-1" });
        assert(
            canAccessSalesSensitiveUpload({ role: "Sales", id: "sales-1" }, member),
            "assigned Sales can access sensitive upload"
        );
        assert(
            !canAccessSalesSensitiveUpload({ role: "Sales", id: "sales-2" }, member),
            "unassigned Sales cannot"
        );
        assert(
            canAccessSalesSensitiveUpload({ role: "Sales Manager", id: "mgr" }, member),
            "Manager can access sensitive upload"
        );
        console.log("Targets / assignee / uploads OK");
        passed += 1;
    }

    console.log(`\nOK — ${passed}/7 sales role scenarios passed.\n`);
}

main();
