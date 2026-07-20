/**
 * Declarative Coach / Coach Manager access matrix mirroring route middleware,
 * plus pure helpers for Coach business rules (PT check-in, notes, requests).
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

/** Capabilities Coach may access (middleware includes Coach). */
const COACH_CAPABILITIES = {
    membersList: {
        method: "GET",
        path: "/api/members/",
        roles: ["Coach", "Coach Manager"], // custom handler; both enter coach branch
        note: "Coach sees assigned only; Coach Manager sees all",
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
        note: "Coach Manager omitted from readAccess (middleware quirk)",
    },
    memberNotes: {
        method: "POST",
        path: "/api/members/:memberId/notes",
        roles: ["Owner", "Sales", "Sales Manager", "Coach", "Coach Manager"],
    },
    todayCoachTransfers: {
        method: "GET",
        path: "/api/members/today-coach-transfers",
        roles: ["Coach", "Coach Manager"],
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
    coachRequestsList: {
        method: "GET",
        path: "/api/coach-requests",
        roles: ["Coach", "Coach Manager", "Owner"],
    },
    createCoachRequest: {
        method: "POST",
        path: "/api/coach-requests",
        roles: ["Coach"],
        note: "Coach-only — Coach Manager cannot create",
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

/** Coach Manager capabilities that exclude Coach. */
const COACH_MANAGER_ONLY = {
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
    updateCoachAbilities: {
        method: "PATCH",
        path: "/api/users/:id/coach-abilities",
        roles: ["Coach Manager"],
    },
    allNotes: {
        method: "GET",
        path: "/api/members/all-notes",
        roles: ["Sales Manager", "Owner", "Coach Manager"],
    },
    bulkTransferCoach: {
        method: "POST",
        path: "/api/members/bulk-transfer-coach",
        roles: ["Coach Manager", "Owner"],
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
    coachRequestStatus: {
        method: "PUT",
        path: "/api/coach-requests/:id/status",
        roles: ["Coach Manager", "Owner"],
    },
    uploadsSensitive: {
        method: "GET",
        path: "/uploads/:filename (nationalId / invitation)",
        roles: ["Receptionist", "Owner", "Sales Manager", "Coach Manager", "Accountant"],
    },
};

/** Routes Coach must not access (sample of sales/ops/finance exclusives). */
const COACH_DENIED = {
    createCoachRequestAsManager: {
        // documented separately — Coach Manager denied create
        method: "POST",
        path: "/api/coach-requests",
        roles: ["Coach"],
    },
    salesRevenue: { method: "GET", path: "/api/users/sales-revenue", roles: ["Sales"] },
    salesManagerRevenue: {
        method: "GET",
        path: "/api/users/sales-manager/revenue",
        roles: ["Sales Manager", "Owner", "Accountant"],
    },
    createPackage: { method: "POST", path: "/api/packages", roles: ["Owner", "Sales Manager"] },
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
    contracts: { method: "GET", path: "/api/contracts", roles: ["Accountant", "Owner"] },
    blockMember: { method: "PATCH", path: "/api/members/:memberId/block", roles: ["Sales Manager"] },
    memberWrite: {
        method: "POST",
        path: "/api/members (writeAccess)",
        roles: ["Receptionist", "Owner", "Sales Manager", "Sales"],
    },
    freeze: {
        method: "POST",
        path: "/api/members freeze",
        roles: ["Receptionist", "Owner", "Sales", "Sales Manager"],
    },
    salesRequestStatus: {
        method: "PUT",
        path: "/api/sales-requests/:id/status",
        roles: ["Sales Manager", "Owner"],
    },
    registerUser: { method: "POST", path: "/api/users/register", roles: ["Owner"] },
};

function isRoleAllowed(userRole, allowedRoles) {
    return allowedRoles.includes(userRole);
}

function coachCan(capabilityId) {
    const cap = COACH_CAPABILITIES[capabilityId];
    return Boolean(cap && isRoleAllowed("Coach", cap.roles));
}

function coachManagerCan(capabilityId, source = "manager") {
    if (source === "manager") {
        const cap = COACH_MANAGER_ONLY[capabilityId];
        return Boolean(cap && isRoleAllowed("Coach Manager", cap.roles));
    }
    const cap = COACH_CAPABILITIES[capabilityId];
    return Boolean(cap && isRoleAllowed("Coach Manager", cap.roles));
}

function isValidCoachAssigneeRole(role) {
    return ["Coach", "Coach Manager"].includes(role);
}

/**
 * Mirrors addCouch_notes ability gate — Coach Manager always allowed.
 */
function canAddCouchNote(userRole, abilities) {
    if (userRole === "Coach") {
        return abilities?.canCommentOnMembers !== false;
    }
    if (userRole === "Coach Manager") return true;
    return ["Coach", "Coach Manager"].includes(userRole);
}

/**
 * Mirrors createRequest ability + self-assign checks (no DB).
 */
function validateCoachRequestCreate({
    member,
    coachUserId,
    abilities,
    hasPendingRequest = false,
}) {
    if (!member) {
        return { ok: false, status: 404, message: "Member not found" };
    }

    const isTakeover = Boolean(member.current_couch);

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
        member.current_couch &&
        member.current_couch.toString() === coachUserId.toString()
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
function applyCoachRequestDecision(request, status, actorId) {
    if (!request) {
        return { ok: false, status: 404, message: "Request not found" };
    }
    if (!["accepted", "rejected"].includes(status)) {
        return { ok: false, status: 400, message: "Invalid status" };
    }
    if (request.status !== "pending") {
        return { ok: false, status: 400, message: "Request has already been processed" };
    }

    request.status = status;
    const sideEffects = [];
    if (status === "accepted" && request.member) {
        request.member.current_couch = request.requestedBy;
        request.member.userlog = request.member.userlog || [];
        request.member.userlog.push({
            type: "assign",
            text: "Assigned via approved coach request",
            createdBy: actorId,
        });
        sideEffects.push("assign", "notify");
    }
    return { ok: true, status: 200, request, sideEffects };
}

function startOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Mirrors sessionCheckIn_for_couch Coach branch (mutates member).
 */
function coachPTCheckIn(member, actorId, now = new Date()) {
    if (member.couch_subscription_status !== "active") {
        return { ok: false, status: 400, message: "Member is not active" };
    }

    const today = startOfDay(now);
    const alreadyCheckedIn = (member.userlog || []).some(
        (log) => log.type === "pt-session" && new Date(log.createdAt) >= today
    );
    if (alreadyCheckedIn) {
        return {
            ok: false,
            status: 400,
            message: "This member already has a session check-in today",
        };
    }

    if (!(member.PT_sessions > member.used_PT_sessions)) {
        return { ok: false, status: 400, message: "Member has no free PT sessions" };
    }

    member.used_PT_sessions += 1;
    member.userlog = member.userlog || [];
    member.userlog.push({
        type: "pt-session",
        text: "Private session check-in (1 session)",
        createdBy: actorId,
        createdAt: now,
    });
    return { ok: true, status: 200, message: "Session checked in", sessions: 1 };
}

/**
 * Mirrors sessionCheckIn_for_couch Coach Manager branch (mutates member).
 * No once-per-day guard; deducts numberOfSessions.
 */
function coachManagerPTCheckIn(member, numberOfSessions, actorId, now = new Date()) {
    if (member.couch_subscription_status !== "active") {
        return { ok: false, status: 400, message: "Member is not active" };
    }

    const n = Number(numberOfSessions);
    if (!n || n <= 0) {
        return { ok: false, status: 400, message: "Member doesn't have enough PT sessions" };
    }

    const remaining = member.PT_sessions - member.used_PT_sessions;
    if (remaining < n) {
        return {
            ok: false,
            status: 400,
            message: "Member doesn't have enough PT sessions",
        };
    }

    member.used_PT_sessions += n;
    member.userlog = member.userlog || [];
    member.userlog.push({
        type: "pt-session",
        text: `Private session check-in (${n} session${n > 1 ? "s" : ""})`,
        createdBy: actorId,
        createdAt: now,
    });
    return { ok: true, status: 200, message: "Session checked in", sessions: n };
}

/**
 * Mirrors getTodayCoachTransfers scoping.
 */
function filterTodayTransfersForRole(transfers, userRole, userId) {
    if (userRole === "Coach") {
        return transfers.filter(
            (t) => t.current_couch && t.current_couch.toString() === userId.toString()
        );
    }
    return transfers;
}

module.exports = {
    ALL_ROLES,
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
};
