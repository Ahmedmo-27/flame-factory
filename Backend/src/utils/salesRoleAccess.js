/**
 * Declarative Sales / Sales Manager access matrix mirroring route middleware,
 * plus pure helpers for Sales business rules (requests, notes, privacy, scoping).
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

/** Capabilities Sales may access (middleware includes Sales). */
const SALES_CAPABILITIES = {
    membersList: {
        method: "GET",
        path: "/api/members/",
        roles: ["Sales", "Sales Manager", "Coach", "Coach Manager"],
        note: "Sales forced to assignedSales = self",
    },
    membersAll: {
        method: "GET",
        path: "/api/members/all",
        roles: ["Receptionist", "Owner", "Sales", "Sales Manager", "Accountant", "Coach", "Coach Manager"],
    },
    memberProfile: {
        method: "GET",
        path: "/api/members/:memberId",
        roles: ["Receptionist", "Owner", "Sales", "Sales Manager", "Coach", "Coach Manager", "Accountant"],
    },
    memberById: {
        method: "GET",
        path: "/api/members/by/:memberId",
        roles: ["Receptionist", "Owner", "Sales", "Sales Manager", "Coach", "Accountant"],
    },
    memberWrite: {
        method: "POST",
        path: "/api/members/",
        roles: ["Receptionist", "Owner", "Sales Manager", "Sales"],
    },
    memberNotes: {
        method: "POST",
        path: "/api/members/:memberId/notes",
        roles: ["Owner", "Sales", "Sales Manager", "Coach", "Coach Manager"],
    },
    memberInvite: {
        method: "POST",
        path: "/api/members/:memberId/invitations",
        roles: ["Receptionist", "Owner", "Sales", "Sales Manager"],
    },
    addAlert: {
        method: "POST",
        path: "/api/members/:memberId/alerts",
        roles: ["Receptionist", "Sales", "Sales Manager"],
    },
    deactivateAlert: {
        method: "PATCH",
        path: "/api/members/:memberId/alerts/:alertId/deactivate",
        roles: ["Receptionist", "Sales", "Sales Manager", "Owner"],
    },
    checkin: {
        method: "POST",
        path: "/api/members/:memberId/checkin",
        roles: ["Receptionist", "Owner", "Sales Manager", "Sales"],
    },
    assignSales: {
        method: "PATCH",
        path: "/api/members/:memberId/assign-sales",
        roles: ["Receptionist", "Owner", "Sales Manager", "Sales"],
    },
    freeze: {
        method: "PATCH",
        path: "/api/members/:memberId/freeze",
        roles: ["Receptionist", "Owner", "Sales", "Sales Manager"],
    },
    todayCheckins: {
        method: "GET",
        path: "/api/members/today-checkins",
        roles: ["Receptionist", "Owner", "Sales", "Sales Manager"],
    },
    salesRequestsList: {
        method: "GET",
        path: "/api/sales-requests",
        roles: ["Sales", "Sales Manager", "Owner"],
    },
    createSalesRequest: {
        method: "POST",
        path: "/api/sales-requests",
        roles: ["Sales"],
        note: "Sales-only — Sales Manager cannot create",
    },
    salesRevenue: {
        method: "GET",
        path: "/api/users/sales-revenue",
        roles: ["Sales"],
        note: "Sales-only own revenue",
    },
    mySubscriptions: {
        method: "GET",
        path: "/api/users/my-subscriptions",
        roles: ["Sales"],
    },
    notifications: {
        method: "ALL",
        path: "/api/notifications",
        roles: ["Sales", "Sales Manager", "Accountant", "Coach", "Coach Manager"],
    },
    uploadsProfile: {
        method: "GET",
        path: "/uploads/:filename (profile)",
        roles: ["Receptionist", "Owner", "Sales", "Sales Manager", "Coach", "Coach Manager", "Accountant"],
    },
};

/** Sales Manager capabilities that exclude Sales. */
const SALES_MANAGER_ONLY = {
    salesRequestStatus: {
        method: "PUT",
        path: "/api/sales-requests/:id/status",
        roles: ["Sales Manager", "Owner"],
    },
    allNotes: {
        method: "GET",
        path: "/api/members/all-notes",
        roles: ["Sales Manager", "Owner", "Coach Manager"],
    },
    bulkTransferSales: {
        method: "POST",
        path: "/api/members/bulk-transfer-sales",
        roles: ["Sales Manager", "Owner"],
    },
    switchSalesRep: {
        method: "PUT",
        path: "/api/members/:memberId/sales-rep",
        roles: ["Sales Manager", "Owner"],
    },
    blockMember: {
        method: "PATCH",
        path: "/api/members/:memberId/block",
        roles: ["Sales Manager"],
    },
    unblockMember: {
        method: "PATCH",
        path: "/api/members/:memberId/unblock",
        roles: ["Sales Manager"],
    },
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
    salesReps: {
        method: "GET",
        path: "/api/users/sales-reps",
        roles: ["Sales Manager", "Owner"],
    },
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
    createStaff: {
        method: "POST",
        path: "/api/users/staff",
        roles: ["Sales Manager", "Owner", "Coach Manager"],
    },
    updateTarget: {
        method: "PATCH",
        path: "/api/users/:id/target",
        roles: ["Sales Manager"],
    },
    updateAbilities: {
        method: "PATCH",
        path: "/api/users/:id/abilities",
        roles: ["Sales Manager"],
    },
    updatePhonePrivacy: {
        method: "PATCH",
        path: "/api/users/:id/phone-privacy",
        roles: ["Sales Manager"],
    },
    updateStaffMobile: {
        method: "PATCH",
        path: "/api/users/:id/mobile",
        roles: ["Sales Manager", "Owner"],
    },
    createPackage: {
        method: "POST",
        path: "/api/packages",
        roles: ["Owner", "Sales Manager"],
    },
    updatePackage: {
        method: "PATCH",
        path: "/api/packages/:id",
        roles: ["Owner", "Sales Manager"],
    },
    deletePackage: {
        method: "DELETE",
        path: "/api/packages/:id",
        roles: ["Owner", "Sales Manager"],
    },
    createPackageException: {
        method: "POST",
        path: "/api/package-exceptions",
        roles: ["Sales Manager"],
    },
    memberPendingException: {
        method: "GET",
        path: "/api/package-exceptions/member/:memberId",
        roles: ["Sales Manager", "Owner", "Accountant", "Receptionist"],
    },
    uploadsSensitive: {
        method: "GET",
        path: "/uploads/:filename (nationalId / invitation)",
        roles: ["Receptionist", "Owner", "Sales Manager", "Coach Manager", "Accountant"],
        note: "Sales only if assigned — not in base sensitive list",
    },
};

/** Routes Sales must not access (ops/finance / other role exclusives). */
const SALES_DENIED = {
    assignPackage: {
        method: "POST",
        path: "/api/members/:memberId/package",
        roles: ["Accountant", "Owner"],
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
    addPTSessions: {
        method: "POST",
        path: "/api/members/:memberId/pt-sessions",
        roles: ["Owner", "Accountant"],
    },
    contracts: { method: "GET", path: "/api/contracts", roles: ["Accountant", "Owner"] },
    listPackageExceptions: {
        method: "GET",
        path: "/api/package-exceptions",
        roles: ["Accountant"],
    },
    updatePackageExceptionStatus: {
        method: "PUT",
        path: "/api/package-exceptions/:id/status",
        roles: ["Accountant"],
    },
    registerUser: { method: "POST", path: "/api/users/register", roles: ["Owner"] },
    changeRole: {
        method: "GET",
        path: "/api/users/changerole/:id/:new_role",
        roles: ["Owner"],
    },
    ptCheckin: {
        method: "POST",
        path: "/api/members/PTcheckin",
        roles: ["Coach", "Coach Manager"],
    },
    couchNotes: {
        method: "POST",
        path: "/api/members/:memberId/couch-notes",
        roles: ["Coach", "Coach Manager"],
    },
    createCoachRequest: {
        method: "POST",
        path: "/api/coach-requests",
        roles: ["Coach"],
    },
    updateCoachAbilities: {
        method: "PATCH",
        path: "/api/users/:id/coach-abilities",
        roles: ["Coach Manager"],
    },
};

function isRoleAllowed(userRole, allowedRoles) {
    return allowedRoles.includes(userRole);
}

function salesCan(capabilityId) {
    const cap = SALES_CAPABILITIES[capabilityId];
    return Boolean(cap && isRoleAllowed("Sales", cap.roles));
}

function salesManagerCan(capabilityId) {
    const cap = SALES_MANAGER_ONLY[capabilityId];
    return Boolean(cap && isRoleAllowed("Sales Manager", cap.roles));
}

function isValidSalesAssigneeRole(role) {
    return ["Sales", "Sales Manager"].includes(role);
}

/**
 * Mirrors getMembers assignedSales scoping for Sales.
 */
function buildSalesMemberListScope(role, userId, queryAssignedSales) {
    if (role === "Sales") return userId;
    return queryAssignedSales;
}

/**
 * Mirrors addNote ability gate — Sales Manager / Owner always allowed.
 */
function canAddSalesNote(userRole, abilities) {
    if (userRole === "Sales") {
        return abilities?.canCommentOnMembers !== false;
    }
    if (["Sales Manager", "Owner"].includes(userRole)) return true;
    return ["Sales", "Sales Manager", "Owner", "Coach", "Coach Manager"].includes(userRole);
}

/**
 * Mirrors createRequest ability + self-assign checks (no DB).
 */
function validateSalesRequestCreate({
    member,
    salesUserId,
    abilities,
    hasPendingRequest = false,
}) {
    if (!member) {
        return { ok: false, status: 404, message: "Member not found" };
    }

    const isTakeover = Boolean(member.assignedSales);

    if (isTakeover && abilities?.canRequestTakeover === false) {
        return {
            ok: false,
            status: 403,
            message: "You are not allowed to request replacing another representative",
        };
    }

    if (!isTakeover && abilities?.canRequestAssignment === false) {
        return {
            ok: false,
            status: 403,
            message: "You are not allowed to request acquiring new members",
        };
    }

    if (
        member.assignedSales &&
        member.assignedSales.toString() === salesUserId.toString()
    ) {
        return {
            ok: false,
            status: 400,
            message: "This member is already assigned to you",
        };
    }

    if (hasPendingRequest) {
        return {
            ok: false,
            status: 400,
            message: "There is already a pending request for this member",
        };
    }

    return {
        ok: true,
        status: 201,
        kind: isTakeover ? "takeover" : "assignment",
    };
}

/**
 * Mirrors updateRequestStatus accept path (no DB).
 */
function applySalesRequestDecision(request, status, actorId) {
    if (!request) {
        return { ok: false, status: 409, message: "Request not found or already processed" };
    }
    if (!["accepted", "rejected"].includes(status)) {
        return { ok: false, status: 400, message: "Invalid status" };
    }
    if (request.status !== "pending") {
        return { ok: false, status: 409, message: "Request not found or already processed" };
    }

    request.status = status;
    const sideEffects = [];
    if (status === "accepted" && request.member) {
        request.member.assignedSales = request.requestedBy;
        request.member.userlog = request.member.userlog || [];
        request.member.userlog.push({
            type: "assign",
            text: "Assigned via approved sales request",
            createdBy: actorId,
        });
        sideEffects.push("assign", "notify");
    }
    return { ok: true, status: 200, request, sideEffects };
}

/**
 * Mirrors updateSalesRepTarget validation (no DB).
 */
function validateSalesTargetUpdate({ actorRole, targetRole, monthlyTarget }) {
    if (actorRole !== "Sales Manager") {
        return {
            ok: false,
            status: 403,
            message: "Only sales managers can update representative targets",
        };
    }
    if (targetRole !== "Sales") {
        return {
            ok: false,
            status: 400,
            message: "Targets can only be set for sales representatives",
        };
    }
    if (monthlyTarget === undefined || monthlyTarget === null) {
        return { ok: false, status: 400, message: "monthlyTarget is required" };
    }
    const target = Number(monthlyTarget);
    if (Number.isNaN(target) || target < 0) {
        return { ok: false, status: 400, message: "monthlyTarget must be a number >= 0" };
    }
    return { ok: true, monthlyTarget: target };
}

/**
 * Sensitive upload access for Sales — assigned only (mirrors app.js intent).
 */
function canAccessSalesSensitiveUpload(user, member) {
    if (!user) return false;
    if (["Receptionist", "Owner", "Sales Manager", "Coach Manager", "Accountant"].includes(user.role)) {
        return true;
    }
    if (user.role === "Sales") {
        const rep = member?.assignedSales;
        const repId = rep?._id ? rep._id.toString() : rep?.toString?.();
        return Boolean(repId && repId === user.id.toString());
    }
    return false;
}

module.exports = {
    ALL_ROLES,
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
};
