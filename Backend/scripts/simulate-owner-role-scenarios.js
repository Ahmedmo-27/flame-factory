#!/usr/bin/env node
/**
 * Runnable multi-scenario simulation of Owner role access and Owner-only actions.
 *
 * Scenarios:
 *  1) Owner-only routes allow Owner, deny other roles
 *  2) Owner allowed on shared ops/finance routes
 *  3) Owner denied on Sales/SM/Coach/Accountant-only routes
 *  4) changeRole validates roles and applies changes
 *  5) Teams page Owner-only guard
 *  6) authorize / authorizeRoles middleware parity for Owner
 *
 * Run: node scripts/simulate-owner-role-scenarios.js
 *  or: npm run simulate:owner-role
 */

// Quiet auth middleware warn noise during simulation
const logger = require("../src/utils/logger");
logger.auth = () => {};

const authorize = require("../src/middleware/roleMiddleware");
const { authorizeRoles } = require("../src/middleware/authMiddleware");
const {
    ALL_ROLES,
    CAPABILITIES,
    OWNER_DENIED_CAPABILITIES,
    isRoleAllowed,
    applyRoleChange,
    assertOwnerTeamsPageAccess,
    listOwnerAllowedCapabilityIds,
    listOwnerDeniedCapabilityIds,
} = require("../src/utils/ownerRoleAccess");

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

function main() {
    let passed = 0;

    // ------------------------------------------------------------------
    line("1) Owner-only routes — Owner allowed, others denied");
    {
        const ownerOnly = ["registerUser", "changeRole", "allTeams"];
        for (const id of ownerOnly) {
            const roles = CAPABILITIES[id].roles;
            assert(roles.length === 1 && roles[0] === "Owner", `${id} must be Owner-only`);
            assert(isRoleAllowed("Owner", roles), `Owner must access ${id}`);
            for (const role of ALL_ROLES.filter((r) => r !== "Owner")) {
                assert(!isRoleAllowed(role, roles), `${role} must not access ${id}`);
            }
            const allow = runMiddleware(authorize(...roles), "Owner");
            const deny = runMiddleware(authorize(...roles), "Accountant");
            assert(allow.nextCalled, `authorize allows Owner for ${id}`);
            assert(!deny.nextCalled && deny.status === 403, `authorize denies Accountant for ${id}`);
        }
        console.log("Owner-only capabilities:", ownerOnly.join(", "));
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("2) Owner allowed on shared ops / finance routes");
    {
        const sharedSamples = [
            "salesManagerRevenue",
            "assignPackage",
            "refundPackage",
            "refundPT",
            "createPackage",
            "contracts",
            "salesRequestStatus",
            "coachRequestStatus",
            "bulkTransferSales",
            "createStaff",
        ];
        for (const id of sharedSamples) {
            assert(isRoleAllowed("Owner", CAPABILITIES[id].roles), `Owner must access ${id}`);
            const result = runMiddleware(authorizeRoles(...CAPABILITIES[id].roles), "Owner");
            assert(result.nextCalled, `authorizeRoles allows Owner for ${id}`);
        }
        const allowedCount = listOwnerAllowedCapabilityIds().length;
        console.log(`Owner allowed on ${allowedCount} capabilities (sampled ${sharedSamples.length})`);
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("3) Owner denied on role-exclusive routes");
    {
        const deniedSamples = [
            "salesRevenue",
            "updateTarget",
            "updateAbilities",
            "blockMember",
            "addAlert",
            "uploadNationalId",
            "ptCheckin",
            "listPackageExceptions",
            "notifications",
            "createSalesRequest",
        ];
        for (const id of deniedSamples) {
            const roles = OWNER_DENIED_CAPABILITIES[id].roles;
            assert(!isRoleAllowed("Owner", roles), `Owner must be denied ${id}`);
            const result = runMiddleware(authorize(...roles), "Owner");
            assert(!result.nextCalled && result.status === 403, `middleware denies Owner for ${id}`);
        }
        console.log(
            `Owner denied on ${listOwnerDeniedCapabilityIds().length} exclusive capabilities (sampled ${deniedSamples.length})`
        );
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("4) changeRole — valid roles apply, invalid rejected");
    {
        const staff = { _id: "u-sales", role: "Sales", name: "Karim" };
        const ok = applyRoleChange(staff, "Sales Manager");
        assert(ok.ok && staff.role === "Sales Manager", "promote Sales → Sales Manager");

        const demote = applyRoleChange(staff, "Receptionist");
        assert(demote.ok && staff.role === "Receptionist", "demote to Receptionist");

        const invalid = applyRoleChange(staff, "SuperAdmin");
        assert(!invalid.ok && invalid.status === 400, "invalid role rejected");
        assert(staff.role === "Receptionist", "role unchanged after invalid change");

        const missing = applyRoleChange(null, "Coach");
        assert(!missing.ok && missing.message.includes("user"), "missing user rejected");

        for (const role of ALL_ROLES) {
            const user = { role: "Sales" };
            const result = applyRoleChange(user, role);
            assert(result.ok && user.role === role, `can assign role ${role}`);
        }
        console.log("changeRole OK for all enum roles; SuperAdmin rejected");
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("5) Teams page — Owner-only controller guard");
    {
        assert(assertOwnerTeamsPageAccess("Owner").ok, "Owner can view teams page");
        for (const role of ALL_ROLES.filter((r) => r !== "Owner")) {
            const result = assertOwnerTeamsPageAccess(role);
            assert(!result.ok && result.status === 403, `${role} blocked from teams page`);
        }
        console.log("Teams page guard: Owner only");
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("6) authorize vs authorizeRoles parity for Owner");
    {
        const roles = ["Sales Manager", "Owner", "Accountant"];
        const a = runMiddleware(authorize(...roles), "Owner");
        const b = runMiddleware(authorizeRoles(...roles), "Owner");
        assert(a.nextCalled && b.nextCalled, "both middlewares allow Owner");

        const aDeny = runMiddleware(authorize(...roles), "Coach");
        const bDeny = runMiddleware(authorizeRoles(...roles), "Coach");
        assert(!aDeny.nextCalled && !bDeny.nextCalled, "both middlewares deny Coach");
        assert(aDeny.status === 403 && bDeny.status === 403, "both return 403");
        console.log("Middleware parity OK");
        passed += 1;
    }

    console.log(`\nOK — ${passed}/6 owner role scenarios passed.\n`);
}

main();
