/**
 * Scenario tests for package + PT refunds and revenue deduction.
 */

const { buildPackageSnapshot } = require("./packageSnapshot");
const {
    subscriptionSalePrice,
    aggregateSubscriptionRevenue,
    memberPrice,
} = require("./revenueUtils");
const {
    issuePackageRefund,
    issuePTRefund,
    validatePackageRefund,
    validatePTRefund,
    applyPackageRefund,
    applyPTRefund,
} = require("./refundUtils");

function makeGymMember(name, pricePaid) {
    const catalog = {
        _id: "pkg-gym",
        name: "Gym",
        activityType: "gym",
        duration: "1 month",
        price: pricePaid,
        freezeLimitDays: 5,
        invitationLimit: 1,
        renewalDiscountPercent: 0,
        hasException: false,
    };
    return {
        _id: `m-${name}`,
        name,
        status: "active",
        subscriptions: [
            {
                package: { ...catalog },
                packageSnapshot: buildPackageSnapshot(catalog),
                pricePaid,
                refundAmount: 0,
                refunded: false,
            },
        ],
        pt_subscriptions: [],
    };
}

function makePTMember(name, pricePaid) {
    return {
        _id: `m-pt-${name}`,
        name,
        status: "active",
        subscriptions: [],
        pt_subscriptions: [
            {
                package: { name: "PT Pack", price: pricePaid },
                pricePaid,
                refundAmount: 0,
                refunded: false,
            },
        ],
    };
}

describe("refund scenarios — package (gym)", () => {
    it("partial refund marks guest, stores audit fields, reduces revenue", () => {
        const member = makeGymMember("Karim", 3000);
        const result = issuePackageRefund({
            memberID: member._id,
            refund_amount: 1000,
            reason: "Early cancel",
            member,
            refundedBy: "owner-1",
        });

        expect(result.ok).toBe(true);
        expect(result.refundAmount).toBe(1000);
        expect(member.status).toBe("guest");
        expect(member.subscriptions[0].refunded).toBe(true);
        expect(member.subscriptions[0].refundReason).toBe("Early cancel");
        expect(member.subscriptions[0].refundedBy).toBe("owner-1");
        expect(member.subscriptions[0].refundedAt).toBeInstanceOf(Date);
        expect(subscriptionSalePrice(member.subscriptions[0])).toBe(2000);
        expect(memberPrice(member)).toBe(2000);
    });

    it("full refund zeros net sale and drops salesCount", () => {
        const member = makeGymMember("Nour", 2500);
        issuePackageRefund({
            memberID: member._id,
            refund_amount: 2500,
            member,
        });
        expect(subscriptionSalePrice(member.subscriptions[0])).toBe(0);
        expect(aggregateSubscriptionRevenue([member])).toEqual({
            totalRevenue: 0,
            salesCount: 0,
        });
    });

    it("rejects over-refund, zero/negative amount, missing id, empty subs, unknown member", () => {
        const member = makeGymMember("Omar", 2000);

        expect(
            validatePackageRefund({
                memberID: member._id,
                refund_amount: 2001,
                member,
            }).ok
        ).toBe(false);

        expect(
            validatePackageRefund({
                memberID: member._id,
                refund_amount: 0,
                member,
            }).ok
        ).toBe(false);

        expect(
            validatePackageRefund({
                memberID: member._id,
                refund_amount: -10,
                member,
            }).ok
        ).toBe(false);

        expect(
            validatePackageRefund({
                memberID: null,
                refund_amount: 100,
                member,
            }).status
        ).toBe(400);

        expect(
            validatePackageRefund({
                memberID: "x",
                refund_amount: 100,
                member: { subscriptions: [] },
            }).message
        ).toMatch(/no subscriptions/i);

        expect(
            validatePackageRefund({
                memberID: "ghost",
                refund_amount: 100,
                member: null,
            }).status
        ).toBe(404);

        expect(member.subscriptions[0].refunded).toBe(false);
        expect(member.status).toBe("active");
    });

    it("accumulates successive package refunds against pricePaid gate", () => {
        const member = makeGymMember("Sara", 4000);
        expect(
            issuePackageRefund({
                memberID: member._id,
                refund_amount: 1500,
                member,
            }).refundAmount
        ).toBe(1500);

        // Gate is pricePaid (4000), not remaining — matches controller
        const second = issuePackageRefund({
            memberID: member._id,
            refund_amount: 2000,
            reason: "Partial 2",
            member,
        });
        expect(second.ok).toBe(true);
        expect(second.refundAmount).toBe(3500);
        expect(subscriptionSalePrice(member.subscriptions[0])).toBe(500);
        expect(member.subscriptions[0].refundReason).toBe("Partial 2");
    });

    it("applyPackageRefund alone mutates last subscription only", () => {
        const member = makeGymMember("Multi", 1000);
        member.subscriptions.unshift({
            pricePaid: 500,
            refundAmount: 0,
            refunded: false,
            packageSnapshot: { price: 500 },
        });
        applyPackageRefund(member, 200, "old keep", "acc-1");
        expect(member.subscriptions[0].refunded).toBe(false);
        expect(member.subscriptions[1].refundAmount).toBe(200);
        expect(member.status).toBe("guest");
    });
});

describe("refund scenarios — PT sessions", () => {
    it("partial PT refund keeps status active", () => {
        const member = makePTMember("Layla", 1600);
        const result = issuePTRefund({
            memberID: member._id,
            refund_amount: 400,
            reason: "Unused",
            member,
        });
        expect(result.ok).toBe(true);
        expect(member.status).toBe("active");
        expect(member.pt_subscriptions[0].refundAmount).toBe(400);
        expect(member.pt_subscriptions[0].refunded).toBe(true);
        expect(member.pt_subscriptions[0].refundReason).toBe("Unused");
    });

    it("allows second PT refund within remaining maxRefundable", () => {
        const member = makePTMember("Youssef", 2000);
        issuePTRefund({ memberID: member._id, refund_amount: 800, member });
        const second = issuePTRefund({
            memberID: member._id,
            refund_amount: 700,
            member,
        });
        expect(second.ok).toBe(true);
        expect(member.pt_subscriptions[0].refundAmount).toBe(1500);

        const remaining = validatePTRefund({
            memberID: member._id,
            refund_amount: 500,
            member,
        });
        expect(remaining.ok).toBe(true);
        expect(remaining.maxRefundable).toBe(500);
    });

    it("rejects PT refund above remaining balance", () => {
        const member = makePTMember("Heba", 1000);
        issuePTRefund({ memberID: member._id, refund_amount: 600, member });
        const over = issuePTRefund({
            memberID: member._id,
            refund_amount: 500,
            member,
        });
        expect(over.ok).toBe(false);
        expect(over.maxRefundable).toBe(400);
        expect(member.pt_subscriptions[0].refundAmount).toBe(600);
    });

    it("rejects PT refund when member has no PT subscriptions", () => {
        const result = validatePTRefund({
            memberID: "x",
            refund_amount: 50,
            member: { pt_subscriptions: [] },
        });
        expect(result.ok).toBe(false);
        expect(result.message).toMatch(/no PT/i);
    });

    it("applyPTRefund does not change member status", () => {
        const member = makePTMember("Ziad", 900);
        applyPTRefund(member, 100, null, "acc-2");
        expect(member.status).toBe("active");
        expect(member.pt_subscriptions[0].refundAmount).toBe(100);
    });
});

describe("refund scenarios — revenue aggregation", () => {
    it("subscriptionSalePrice subtracts refundAmount and clamps at 0", () => {
        expect(subscriptionSalePrice({ pricePaid: 1000, refundAmount: 300 })).toBe(700);
        expect(subscriptionSalePrice({ pricePaid: 1000, refundAmount: 1000 })).toBe(0);
        expect(subscriptionSalePrice({ pricePaid: 1000, refundAmount: 1500 })).toBe(0);
    });

    it("aggregateSubscriptionRevenue reflects mixed refunds", () => {
        const a = makeGymMember("A", 3000);
        const b = makeGymMember("B", 3000);
        const c = makeGymMember("C", 3000);

        issuePackageRefund({ memberID: a._id, refund_amount: 1000, member: a });
        issuePackageRefund({ memberID: b._id, refund_amount: 3000, member: b });

        expect(aggregateSubscriptionRevenue([a, b, c])).toEqual({
            totalRevenue: 5000,
            salesCount: 2,
        });
    });
});
