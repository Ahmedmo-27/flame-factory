/**
 * Declarative Owner role access matrix mirroring route middleware.
 * Used by simulation scripts and unit tests.
 */

const ALL_ROLES = [
    "Owner",
    "Receptionist",
    "Coach",
    "Coach Manager",
    "Accountant",
    "Sales",
    "Sales Manager",
];

/**
 * Route-level capabilities and the roles allowed by middleware.
 * Keys are stable capability ids; `roles` matches authorize / authorizeRoles lists.
 */
const CAPABILITIES = {
    // Owner-only
    registerUser: { method: "POST", path: "/api/users/register", roles: ["Owner"] },
    changeRole: { method: "GET", path: "/api/users/changerole/:id/:new_role", roles: ["Owner"] },
    allTeams: { method: "GET", path: "/api/users/allTeams", roles: ["Owner"] },

    // Shared — Owner allowed
    salesManagerRevenue: {
        method: "GET",
        path: "/api/users/sales-manager/revenue",
        roles: ["Sales Manager", "Owner", "Accountant"],
    },
    salesManagerSubscriptions: {
        method: "GET",
        path: "/api/users/sales-manager/subscriptions",
        roles: ["Sales Manager", "Owner", "Accountant"],
    },
    salesReps: { method: "GET", path: "/api/users/sales-reps", roles: ["Sales Manager", "Owner"] },
    salesUsers: {
        method: "GET",
        path: "/api/users/sales",
        roles: ["Sales Manager", "Owner", "Accountant", "Receptionist"],
    },
    salesTeam: {
        method: "GET",
        path: "/api/users/team",
        roles: ["Sales Manager", "Owner", "Accountant"],
    },
    salesProfile: {
        method: "GET",
        path: "/api/users/team/:id",
        roles: ["Sales Manager", "Owner", "Accountant"],
    },
    coachTeam: {
        method: "GET",
        path: "/api/users/coach-team",
        roles: ["Coach Manager", "Owner", "Sales Manager", "Receptionist"],
    },
    coachProfile: {
        method: "GET",
        path: "/api/users/coach-team/:id",
        roles: ["Coach Manager", "Owner"],
    },
    createStaff: {
        method: "POST",
        path: "/api/users/staff",
        roles: ["Sales Manager", "Owner", "Coach Manager"],
    },
    updateStaffMobile: {
        method: "PATCH",
        path: "/api/users/:id/mobile",
        roles: ["Sales Manager", "Owner"],
    },
    receptionistTeam: {
        method: "GET",
        path: "/api/users/receptionist-team",
        roles: ["Sales Manager", "Owner", "Accountant"],
    },
    getUserById: {
        method: "GET",
        path: "/api/users/:id",
        roles: ["Sales Manager", "Owner", "Accountant"],
    },

    memberWrite: {
        method: "POST",
        path: "/api/members (writeAccess)",
        roles: ["Receptionist", "Owner", "Sales Manager", "Sales"],
    },
    memberNotes: {
        method: "POST",
        path: "/api/members notes",
        roles: ["Owner", "Sales", "Sales Manager", "Coach", "Coach Manager"],
    },
    memberFreeze: {
        method: "POST",
        path: "/api/members freeze",
        roles: ["Receptionist", "Owner", "Sales", "Sales Manager"],
    },
    memberInvite: {
        method: "POST",
        path: "/api/members invite",
        roles: ["Receptionist", "Owner", "Sales", "Sales Manager"],
    },
    getAllMembersList: {
        method: "GET",
        path: "/api/members/",
        roles: ["Owner", "Accountant", "Receptionist"],
    },
    getAllMembers: {
        method: "GET",
        path: "/api/members/all",
        roles: ["Receptionist", "Owner", "Sales", "Sales Manager", "Accountant", "Coach", "Coach Manager"],
    },
    allNotes: {
        method: "GET",
        path: "/api/members/all-notes",
        roles: ["Sales Manager", "Owner", "Coach Manager"],
    },
    todayCheckins: {
        method: "GET",
        path: "/api/members/today-checkins",
        roles: ["Receptionist", "Owner", "Sales", "Sales Manager"],
    },
    bulkTransferSales: {
        method: "POST",
        path: "/api/members/bulk-transfer-sales",
        roles: ["Sales Manager", "Owner"],
    },
    bulkTransferCoach: {
        method: "POST",
        path: "/api/members/bulk-transfer-coach",
        roles: ["Coach Manager", "Owner"],
    },
    switchSalesRep: {
        method: "PUT",
        path: "/api/members/:memberId/sales-rep",
        roles: ["Sales Manager", "Owner"],
    },
    deactivateAlert: {
        method: "PATCH",
        path: "/api/members/:memberId/alerts/:alertId/deactivate",
        roles: ["Receptionist", "Sales", "Sales Manager", "Owner"],
    },
    assignPackage: {
        method: "POST",
        path: "/api/members/:memberId/package",
        roles: ["Accountant", "Owner"],
    },
    assignCoach: {
        method: "PATCH",
        path: "/api/members/:memberId/assign-coach",
        roles: ["Coach Manager", "Owner"],
    },
    switchCoach: {
        method: "PUT",
        path: "/api/members/:memberId/coach-rep",
        roles: ["Coach Manager", "Owner"],
    },
    addPTSessions: {
        method: "POST",
        path: "/api/members/:memberId/pt-sessions",
        roles: ["Owner", "Accountant"],
    },
    refundPackage: {
        method: "POST",
        path: "/api/members/:memberId/refund",
        roles: ["Owner", "Accountant"],
    },
    refundPT: {
        method: "POST",
        path: "/api/members/:memberId/refund_pt",
        roles: ["Owner", "Accountant"],
    },

    createPackage: { method: "POST", path: "/api/packages", roles: ["Owner", "Sales Manager"] },
    updatePackage: { method: "PATCH", path: "/api/packages/:id", roles: ["Owner", "Sales Manager"] },
    deletePackage: { method: "DELETE", path: "/api/packages/:id", roles: ["Owner", "Sales Manager"] },

    salesRequestsList: {
        method: "GET",
        path: "/api/sales-requests",
        roles: ["Sales", "Sales Manager", "Owner"],
    },
    salesRequestStatus: {
        method: "PUT",
        path: "/api/sales-requests/:id/status",
        roles: ["Sales Manager", "Owner"],
    },
    coachRequestsList: {
        method: "GET",
        path: "/api/coach-requests",
        roles: ["Coach", "Coach Manager", "Owner"],
    },
    coachRequestStatus: {
        method: "PUT",
        path: "/api/coach-requests/:id/status",
        roles: ["Coach Manager", "Owner"],
    },
    contracts: { method: "GET", path: "/api/contracts", roles: ["Accountant", "Owner"] },
    memberPendingException: {
        method: "GET",
        path: "/api/package-exceptions/member/:memberId",
        roles: ["Sales Manager", "Owner", "Accountant", "Receptionist"],
    },
    uploads: {
        method: "GET",
        path: "/uploads/:filename",
        roles: ["Receptionist", "Owner", "Sales", "Sales Manager", "Coach", "Coach Manager", "Accountant"],
    },
};

/** Capabilities Owner must NOT access (route middleware excludes Owner). */
const OWNER_DENIED_CAPABILITIES = {
    salesRevenue: { method: "GET", path: "/api/users/sales-revenue", roles: ["Sales"] },
    mySubscriptions: { method: "GET", path: "/api/users/my-subscriptions", roles: ["Sales"] },
    updateTarget: { method: "PATCH", path: "/api/users/:id/target", roles: ["Sales Manager"] },
    updateAbilities: { method: "PATCH", path: "/api/users/:id/abilities", roles: ["Sales Manager"] },
    updateCoachAbilities: {
        method: "PATCH",
        path: "/api/users/:id/coach-abilities",
        roles: ["Coach Manager"],
    },
    updatePhonePrivacy: {
        method: "PATCH",
        path: "/api/users/:id/phone-privacy",
        roles: ["Sales Manager"],
    },
    blockMember: { method: "PATCH", path: "/api/members/:memberId/block", roles: ["Sales Manager"] },
    unblockMember: {
        method: "PATCH",
        path: "/api/members/:memberId/unblock",
        roles: ["Sales Manager"],
    },
    addAlert: {
        method: "POST",
        path: "/api/members/:memberId/alerts",
        roles: ["Receptionist", "Sales", "Sales Manager"],
    },
    uploadNationalId: {
        method: "PATCH",
        path: "/api/members/:memberId/national-id",
        roles: ["Accountant"],
    },
    uploadPhoto: { method: "PATCH", path: "/api/members/:memberId/photo", roles: ["Accountant"] },
    deletePhoto: { method: "DELETE", path: "/api/members/:memberId/photo", roles: ["Accountant"] },
    ptCheckin: { method: "POST", path: "/api/members/PTcheckin", roles: ["Coach", "Coach Manager"] },
    couchNotes: {
        method: "POST",
        path: "/api/members/:memberId/couch-notes",
        roles: ["Coach", "Coach Manager"],
    },
    todayCoachTransfers: {
        method: "GET",
        path: "/api/members/today-coach-transfers",
        roles: ["Coach", "Coach Manager"],
    },
    createSalesRequest: { method: "POST", path: "/api/sales-requests", roles: ["Sales"] },
    createCoachRequest: { method: "POST", path: "/api/coach-requests", roles: ["Coach"] },
    listPackageExceptions: { method: "GET", path: "/api/package-exceptions", roles: ["Accountant"] },
    createPackageException: {
        method: "POST",
        path: "/api/package-exceptions",
        roles: ["Sales Manager"],
    },
    updatePackageExceptionStatus: {
        method: "PUT",
        path: "/api/package-exceptions/:id/status",
        roles: ["Accountant"],
    },
    notifications: {
        method: "ALL",
        path: "/api/notifications",
        roles: ["Sales", "Sales Manager", "Accountant", "Coach", "Coach Manager"],
    },
};

function isRoleAllowed(userRole, allowedRoles) {
    return allowedRoles.includes(userRole);
}

function ownerCan(capabilityId) {
    const cap = CAPABILITIES[capabilityId];
    if (!cap) return false;
    return isRoleAllowed("Owner", cap.roles);
}

function ownerDenied(capabilityId) {
    const cap = OWNER_DENIED_CAPABILITIES[capabilityId];
    if (!cap) return false;
    return !isRoleAllowed("Owner", cap.roles);
}

function validateRoleChange(new_role) {
    if (!ALL_ROLES.includes(new_role)) {
        return { ok: false, status: 400, message: "invalid type" };
    }
    return { ok: true };
}

/**
 * Mirrors change_Role controller (without DB).
 */
function applyRoleChange(user, new_role) {
    if (!user) {
        return { ok: false, status: 400, message: "user doesnt" };
    }
    const check = validateRoleChange(new_role);
    if (!check.ok) return check;
    user.role = new_role;
    return { ok: true, status: 200, user };
}

/**
 * Mirrors getTeamsPage Owner-only guard.
 */
function assertOwnerTeamsPageAccess(userRole) {
    if (userRole !== "Owner") {
        return {
            ok: false,
            status: 403,
            message: "Only the owner can view this page",
        };
    }
    return { ok: true };
}

function listOwnerAllowedCapabilityIds() {
    return Object.keys(CAPABILITIES).filter((id) => ownerCan(id));
}

function listOwnerDeniedCapabilityIds() {
    return Object.keys(OWNER_DENIED_CAPABILITIES).filter((id) => ownerDenied(id));
}

module.exports = {
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
};
