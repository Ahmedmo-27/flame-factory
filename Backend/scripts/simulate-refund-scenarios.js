#!/usr/bin/env node
/**
 * Runnable multi-scenario simulation for package + PT refunds and revenue impact.
 *
 * Scenarios:
 *  1) Partial package refund → guest status, revenue reduced
 *  2) Full package refund → net revenue 0 (sale dropped from count)
 *  3) Reject over-refund / invalid amount / missing subscriptions
 *  4) Cumulative package refunds accumulate refundAmount
 *  5) PT partial refund (status unchanged)
 *  6) PT second refund within remaining balance
 *  7) PT over remaining balance rejected
 *  8) Mixed members: aggregate revenue after refunds
 *
 * Run: node scripts/simulate-refund-scenarios.js
 *  or: npm run simulate:refund-scenarios
 */

const { buildPackageSnapshot } = require("../src/utils/packageSnapshot");
const {
    subscriptionSalePrice,
    aggregateSubscriptionRevenue,
    memberPrice,
} = require("../src/utils/revenueUtils");
const {
    issuePackageRefund,
    issuePTRefund,
    validatePackageRefund,
    validatePTRefund,
} = require("../src/utils/refundUtils");

function line(title) {
    console.log(`\n=== ${title} ===`);
}

function assert(condition, message) {
    if (!condition) {
        console.error(`\nFAIL: ${message}`);
        process.exit(1);
    }
}

function makeGymMember(name, pricePaid, extras = {}) {
    const catalog = {
        _id: "pkg-gym-3m",
        name: "Gym 3 Months",
        activityType: "gym",
        duration: "3 months",
        price: pricePaid,
        freezeLimitDays: 10,
        invitationLimit: 2,
        renewalDiscountPercent: 0,
        hasException: false,
        free_pt_sessions: 0,
    };
    return {
        _id: `member-${name.toLowerCase()}`,
        name,
        status: "active",
        subscriptions: [
            {
                package: { ...catalog },
                packageSnapshot: buildPackageSnapshot(catalog),
                pricePaid,
                startDate: new Date("2026-01-15"),
                refundAmount: 0,
                refunded: false,
            },
        ],
        pt_subscriptions: [],
        ...extras,
    };
}

function makePTMember(name, pricePaid) {
    return {
        _id: `member-pt-${name.toLowerCase()}`,
        name,
        status: "active",
        subscriptions: [],
        pt_subscriptions: [
            {
                package: { name: "PT 8 Sessions", price: pricePaid },
                pricePaid,
                createdAt: new Date("2026-02-01"),
                refundAmount: 0,
                refunded: false,
            },
        ],
    };
}

function main() {
    let passed = 0;

    // ------------------------------------------------------------------
    line("1) Partial package refund → status guest, revenue reduced");
    {
        const karim = makeGymMember("Karim", 3000);
        const before = aggregateSubscriptionRevenue([karim]);
        assert(before.totalRevenue === 3000, "pre-refund revenue should be 3000");

        const result = issuePackageRefund({
            memberID: karim._id,
            refund_amount: 1000,
            reason: "Early cancellation",
            member: karim,
            refundedBy: "owner-1",
        });

        assert(result.ok, "partial refund should succeed");
        assert(karim.status === "guest", "member should become guest");
        assert(karim.subscriptions[0].refunded === true, "subscription marked refunded");
        assert(karim.subscriptions[0].refundAmount === 1000, "refundAmount should be 1000");
        assert(karim.subscriptions[0].refundReason === "Early cancellation", "reason stored");
        assert(subscriptionSalePrice(karim.subscriptions[0]) === 2000, "net sale should be 2000");
        assert(memberPrice(karim) === 2000, "memberPrice should be 2000");
        assert(aggregateSubscriptionRevenue([karim]).totalRevenue === 2000, "revenue 2000");
        console.log("Karim after partial refund:", {
            status: karim.status,
            refundAmount: karim.subscriptions[0].refundAmount,
            netSale: subscriptionSalePrice(karim.subscriptions[0]),
        });
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("2) Full package refund → net revenue 0, sale excluded from count");
    {
        const nour = makeGymMember("Nour", 2500);
        const result = issuePackageRefund({
            memberID: nour._id,
            refund_amount: 2500,
            reason: "Full refund",
            member: nour,
        });
        assert(result.ok, "full refund should succeed");
        assert(subscriptionSalePrice(nour.subscriptions[0]) === 0, "net sale 0");
        const agg = aggregateSubscriptionRevenue([nour]);
        assert(agg.totalRevenue === 0, "total revenue 0 after full refund");
        assert(agg.salesCount === 0, "zero-net sales are not counted");
        console.log("Nour after full refund:", agg);
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("3) Reject invalid / over / empty-subscription package refunds");
    {
        const omar = makeGymMember("Omar", 2000);
        const over = validatePackageRefund({
            memberID: omar._id,
            refund_amount: 2001,
            member: omar,
        });
        assert(!over.ok && over.status === 400, "over-refund should be rejected");
        assert(over.message.includes("exceeds"), "over-refund message");

        const zero = validatePackageRefund({
            memberID: omar._id,
            refund_amount: 0,
            member: omar,
        });
        assert(!zero.ok, "zero amount rejected");

        const negative = validatePackageRefund({
            memberID: omar._id,
            refund_amount: -50,
            member: omar,
        });
        assert(!negative.ok, "negative amount rejected");

        const noId = validatePackageRefund({
            memberID: null,
            refund_amount: 100,
            member: omar,
        });
        assert(!noId.ok && noId.message.includes("member ID"), "missing memberID rejected");

        const guest = { _id: "g1", subscriptions: [], pt_subscriptions: [] };
        const empty = validatePackageRefund({
            memberID: guest._id,
            refund_amount: 100,
            member: guest,
        });
        assert(!empty.ok && empty.message.includes("no subscriptions"), "no subs rejected");

        const missing = validatePackageRefund({
            memberID: "ghost",
            refund_amount: 100,
            member: null,
        });
        assert(!missing.ok && missing.status === 404, "unknown member 404");

        // Omar untouched
        assert(omar.subscriptions[0].refunded === false, "failed refunds must not mutate");
        assert(omar.status === "active", "status unchanged after rejected refund");
        console.log("Validation rejections OK:", {
            over: over.message,
            empty: empty.message,
            missing: missing.message,
        });
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("4) Cumulative package refunds accumulate refundAmount");
    {
        const sara = makeGymMember("Sara", 4000);
        const first = issuePackageRefund({
            memberID: sara._id,
            refund_amount: 1500,
            reason: "Partial 1",
            member: sara,
        });
        assert(first.ok && first.refundAmount === 1500, "first cumulative refund");

        // Controller compares against pricePaid (4000), not remaining (2500)
        const second = issuePackageRefund({
            memberID: sara._id,
            refund_amount: 2000,
            reason: "Partial 2",
            member: sara,
        });
        assert(second.ok && second.refundAmount === 3500, "second accumulates to 3500");
        assert(subscriptionSalePrice(sara.subscriptions[0]) === 500, "net 500");
        assert(sara.subscriptions[0].refundReason === "Partial 2", "latest reason kept");
        console.log("Sara cumulative:", {
            refundAmount: sara.subscriptions[0].refundAmount,
            netSale: subscriptionSalePrice(sara.subscriptions[0]),
        });
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("5) PT partial refund — status stays active");
    {
        const layla = makePTMember("Layla", 1600);
        const result = issuePTRefund({
            memberID: layla._id,
            refund_amount: 400,
            reason: "Unused sessions",
            member: layla,
        });
        assert(result.ok, "PT partial refund ok");
        assert(layla.status === "active", "PT refund must not change status");
        assert(layla.pt_subscriptions[0].refundAmount === 400, "PT refundAmount 400");
        assert(layla.pt_subscriptions[0].refunded === true, "PT marked refunded");
        console.log("Layla PT after partial:", {
            status: layla.status,
            refundAmount: layla.pt_subscriptions[0].refundAmount,
        });
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("6) PT second refund within remaining balance");
    {
        const youssef = makePTMember("Youssef", 2000);
        issuePTRefund({
            memberID: youssef._id,
            refund_amount: 800,
            member: youssef,
        });
        const second = issuePTRefund({
            memberID: youssef._id,
            refund_amount: 700,
            reason: "More unused",
            member: youssef,
        });
        assert(second.ok, "second PT refund within remaining should succeed");
        assert(youssef.pt_subscriptions[0].refundAmount === 1500, "cumulative PT 1500");
        const check = validatePTRefund({
            memberID: youssef._id,
            refund_amount: 500,
            member: youssef,
        });
        assert(check.ok && check.maxRefundable === 500, "remaining maxRefundable 500");
        console.log("Youssef PT cumulative:", {
            refundAmount: youssef.pt_subscriptions[0].refundAmount,
            maxRefundable: check.maxRefundable,
        });
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("7) PT over remaining balance rejected");
    {
        const heba = makePTMember("Heba", 1000);
        issuePTRefund({
            memberID: heba._id,
            refund_amount: 600,
            member: heba,
        });
        const over = issuePTRefund({
            memberID: heba._id,
            refund_amount: 500,
            member: heba,
        });
        assert(!over.ok && over.status === 400, "PT over remaining rejected");
        assert(over.maxRefundable === 400, "maxRefundable should be 400");
        assert(heba.pt_subscriptions[0].refundAmount === 600, "amount unchanged after reject");

        const emptyPT = validatePTRefund({
            memberID: "x",
            refund_amount: 10,
            member: { _id: "x", pt_subscriptions: [] },
        });
        assert(!emptyPT.ok && emptyPT.message.includes("no PT"), "no PT subs rejected");
        console.log("PT over-refund rejection:", over.message);
        passed += 1;
    }

    // ------------------------------------------------------------------
    line("8) Mixed members — aggregate gym revenue after refunds");
    {
        const a = makeGymMember("A", 3000);
        const b = makeGymMember("B", 3000);
        const c = makeGymMember("C", 3000);

        issuePackageRefund({
            memberID: a._id,
            refund_amount: 1000,
            member: a,
        });
        issuePackageRefund({
            memberID: b._id,
            refund_amount: 3000,
            member: b,
        });
        // c: no refund

        const agg = aggregateSubscriptionRevenue([a, b, c]);
        // a: 2000, b: 0 (excluded), c: 3000 → 5000, salesCount 2
        assert(agg.totalRevenue === 5000, `expected 5000, got ${agg.totalRevenue}`);
        assert(agg.salesCount === 2, `expected salesCount 2, got ${agg.salesCount}`);
        console.log("Mixed aggregate:", agg);
        passed += 1;
    }

    console.log(`\nOK — ${passed}/8 refund scenarios passed.\n`);
}

main();
