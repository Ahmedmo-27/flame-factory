/**
 * Server-side PII redaction for Sales reps viewing members they do not own.
 * Must be applied in every response path that returns member PII — not only the UI.
 */

function getSalesRepId(memberObj) {
    const rep = memberObj.salesRep || memberObj.assignedSales;
    if (!rep) return null;
    return rep._id ? rep._id.toString() : rep.toString();
}

function isAssignedToRep(memberObj, userId) {
    const repId = getSalesRepId(memberObj);
    return Boolean(repId && userId && repId === userId.toString());
}

function getCoachId(memberObj) {
    const coach = memberObj.current_couch;
    if (!coach) return null;
    return coach._id ? coach._id.toString() : coach.toString();
}

function redactMemberForViewer(memberObj, user) {
    if (!memberObj || !user) return memberObj;

    if (user.role === "Sales" || user.role === "Receptionist") {
        if (user.canViewPhones === false) {
            return {
                ...memberObj,
                phones: "hidden",
                nationalId: null,
            };
        }
    }

    if (user.role === "Sales") {
        if (isAssignedToRep(memberObj, user.id)) return memberObj;
        return {
            ...memberObj,
            phones: null,
            nationalId: null,
        };
    }

    // Receptionist with canViewPhones=true sees full phone numbers

    if (user.role === "Coach") {
        const coachId = getCoachId(memberObj);
        if (coachId && coachId === user.id.toString()) return memberObj;
        return {
            ...memberObj,
            phones: null,
        };
    }

    return memberObj;
}

module.exports = {
    getSalesRepId,
    isAssignedToRep,
    redactMemberForViewer,
};
