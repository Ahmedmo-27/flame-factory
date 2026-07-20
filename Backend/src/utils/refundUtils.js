/**
 * Pure refund helpers mirroring memberController.refund / refundPT_Sessions.
 * Used by simulation scripts and unit tests (no DB / Express).
 */

function validateRefundAmount(refund_amount) {
    if (refund_amount == null || Number(refund_amount) <= 0) {
        return { ok: false, status: 400, message: "Please enter a valid refund amount" };
    }
    return { ok: true };
}

/**
 * Package (gym) refund validation — mirrors refund().
 * Note: compares against pricePaid only (not remaining after prior refunds),
 * matching the production controller.
 */
function validatePackageRefund({ memberID, refund_amount, member }) {
    if (!memberID) {
        return { ok: false, status: 400, message: "Please enter the member ID" };
    }

    const amountCheck = validateRefundAmount(refund_amount);
    if (!amountCheck.ok) return amountCheck;

    if (!member) {
        return { ok: false, status: 404, message: "Invalid member ID" };
    }

    if (!member.subscriptions?.length) {
        return { ok: false, status: 400, message: "Member has no subscriptions" };
    }

    const lastSubscription = member.subscriptions[member.subscriptions.length - 1];
    if (Number(refund_amount) > lastSubscription.pricePaid) {
        return { ok: false, status: 400, message: "Refund amount exceeds the amount paid" };
    }

    return { ok: true, lastSubscription };
}

/**
 * Apply a package refund onto the last gym subscription (mutates member).
 */
function applyPackageRefund(member, refund_amount, reason = null, refundedBy = "accountant-1") {
    const lastSubscription = member.subscriptions[member.subscriptions.length - 1];
    lastSubscription.refundAmount = (lastSubscription.refundAmount || 0) + Number(refund_amount);
    lastSubscription.refundReason = reason || null;
    lastSubscription.refundedBy = refundedBy;
    lastSubscription.refundedAt = new Date();
    lastSubscription.refunded = true;
    member.status = "guest";
    return {
        refundAmount: lastSubscription.refundAmount,
        member,
    };
}

/**
 * PT sessions refund validation — mirrors refundPT_Sessions().
 * Uses remaining refundable = pricePaid - alreadyRefunded.
 */
function validatePTRefund({ memberID, refund_amount, member }) {
    if (!memberID) {
        return { ok: false, status: 400, message: "Please enter the member ID" };
    }

    const amountCheck = validateRefundAmount(refund_amount);
    if (!amountCheck.ok) return amountCheck;

    if (!member) {
        return { ok: false, status: 404, message: "Invalid member ID" };
    }

    if (!member.pt_subscriptions?.length) {
        return { ok: false, status: 400, message: "Member has no PT subscriptions" };
    }

    const lastSub = member.pt_subscriptions[member.pt_subscriptions.length - 1];
    const alreadyRefunded = lastSub.refundAmount || 0;
    const maxRefundable = lastSub.pricePaid - alreadyRefunded;

    if (Number(refund_amount) > maxRefundable) {
        return {
            ok: false,
            status: 400,
            message: `Refund amount exceeds the refundable amount. Max refundable: ${maxRefundable} EGP`,
            maxRefundable,
        };
    }

    return { ok: true, lastSub, maxRefundable };
}

/**
 * Apply a PT sessions refund onto the last PT subscription (mutates member).
 * Does not change member.status (matches production controller).
 */
function applyPTRefund(member, refund_amount, reason = null, refundedBy = "accountant-1") {
    const lastSub = member.pt_subscriptions[member.pt_subscriptions.length - 1];
    const alreadyRefunded = lastSub.refundAmount || 0;
    lastSub.refundAmount = alreadyRefunded + Number(refund_amount);
    lastSub.refundReason = reason || null;
    lastSub.refundedBy = refundedBy;
    lastSub.refundedAt = new Date();
    lastSub.refunded = true;
    return {
        refundAmount: lastSub.refundAmount,
        member,
    };
}

/**
 * Convenience: validate + apply package refund. Returns { ok, ... } or error shape.
 */
function issuePackageRefund({ memberID, refund_amount, reason, member, refundedBy }) {
    const check = validatePackageRefund({ memberID, refund_amount, member });
    if (!check.ok) return check;
    const result = applyPackageRefund(member, refund_amount, reason, refundedBy);
    return { ok: true, status: 200, message: "Amount refunded successfully", ...result };
}

/**
 * Convenience: validate + apply PT refund.
 */
function issuePTRefund({ memberID, refund_amount, reason, member, refundedBy }) {
    const check = validatePTRefund({ memberID, refund_amount, member });
    if (!check.ok) return check;
    const result = applyPTRefund(member, refund_amount, reason, refundedBy);
    return {
        ok: true,
        status: 200,
        message: "PT sessions refund issued successfully",
        ...result,
    };
}

module.exports = {
    validateRefundAmount,
    validatePackageRefund,
    applyPackageRefund,
    validatePTRefund,
    applyPTRefund,
    issuePackageRefund,
    issuePTRefund,
};
