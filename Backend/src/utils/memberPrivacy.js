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

function redactMemberForViewer(memberObj, user) {
    if (!memberObj || !user) return memberObj;
    if (user.role !== "Sales") return memberObj;
    if (isAssignedToRep(memberObj, user.id)) return memberObj;

    return {
        ...memberObj,
        phones: null,
        nationalId: null,
    };
}

module.exports = {
    getSalesRepId,
    isAssignedToRep,
    redactMemberForViewer,
};
