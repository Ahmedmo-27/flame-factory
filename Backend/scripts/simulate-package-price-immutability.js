#!/usr/bin/env node
/**
 * Runnable simulation of:
 *  1) Members purchase a package (payment + snapshot saved)
 *  2) Sales manager changes package price / freeze / invitations / other terms
 *  3) Old members keep original snapshot terms; revenue stays on pricePaid
 *
 * Run: node scripts/simulate-package-price-immutability.js
 *  or: npm run simulate:package-immutability
 */

const { buildPackageSnapshot, resolveSubscriptionPackage } = require("../src/utils/packageSnapshot");
const {
    aggregateSubscriptionRevenue,
    aggregateRevenueFromLiveCatalogPrice,
    memberPrice,
    getCurrentPackage,
} = require("../src/utils/revenueUtils");

function line(title) {
    console.log(`\n=== ${title} ===`);
}

function purchase(memberName, catalogPkg, pricePaid, usage = {}) {
    return {
        name: memberName,
        freezeDaysUsed: usage.freezeDaysUsed ?? 0,
        invitationsUsed: usage.invitationsUsed ?? 0,
        subscriptions: [
            {
                package: { ...catalogPkg },
                packageSnapshot: buildPackageSnapshot(catalogPkg),
                pricePaid,
                startDate: new Date("2026-01-15"),
            },
        ],
    };
}

/** Mirrors memberController entitlement math (uses purchased snapshot via getCurrentPackage). */
function entitlementStats(member) {
    const pkg = getCurrentPackage(member);
    return {
        freezeLimitDays: pkg?.freezeLimitDays ?? 0,
        freezeDaysRemaining: (pkg?.freezeLimitDays || 0) - (member.freezeDaysUsed || 0),
        invitationLimit: pkg?.invitationLimit ?? 0,
        invitationsRemaining: (pkg?.invitationLimit || 0) - (member.invitationsUsed || 0),
        // What a buggy live-catalog path would show after a catalog edit
        liveFreezeLimit: member.subscriptions[0]?.package?.freezeLimitDays ?? 0,
        liveInvitationLimit: member.subscriptions[0]?.package?.invitationLimit ?? 0,
    };
}

function assert(condition, message) {
    if (!condition) {
        console.error(`\nFAIL: ${message}`);
        process.exit(1);
    }
}

function main() {
    const catalog = {
        _id: "pkg-gym-3m",
        name: "Gym 3 Months",
        activityType: "gym",
        duration: "3 months",
        price: 3000,
        freezeLimitDays: 10,
        invitationLimit: 2,
        renewalDiscountPercent: 10,
        description: "Standard gym",
        hasException: false,
        free_pt_sessions: 0,
    };

    line("1) Members purchase at catalog terms (price 3000, freeze 10d, invitations 2)");
    const members = [
        purchase("Karim", catalog, catalog.price, { freezeDaysUsed: 3, invitationsUsed: 1 }),
        purchase("Nour", catalog, catalog.price),
    ];
    let revenue = aggregateSubscriptionRevenue(members);
    const karimBefore = entitlementStats(members[0]);
    console.log("Total revenue (from pricePaid):", revenue.totalRevenue);
    console.log("Karim payment:", members[0].subscriptions[0].pricePaid);
    console.log("Karim snapshot:", {
        price: members[0].subscriptions[0].packageSnapshot.price,
        freezeLimitDays: members[0].subscriptions[0].packageSnapshot.freezeLimitDays,
        invitationLimit: members[0].subscriptions[0].packageSnapshot.invitationLimit,
    });
    console.log("Karim entitlements:", {
        freezeDaysRemaining: karimBefore.freezeDaysRemaining,
        invitationsRemaining: karimBefore.invitationsRemaining,
    });

    line("2) Sales manager updates catalog (price 3000→5000, freeze 10→30, invitations 2→5)");
    Object.assign(catalog, {
        name: "Gym 3 Months PRO",
        price: 5000,
        freezeLimitDays: 30,
        invitationLimit: 5,
        renewalDiscountPercent: 25,
    });
    for (const m of members) {
        m.subscriptions[0].package = { ...catalog };
    }
    console.log("Live catalog now:", {
        price: catalog.price,
        freezeLimitDays: catalog.freezeLimitDays,
        invitationLimit: catalog.invitationLimit,
    });

    line("3) Old members keep original purchased characteristics (not the new catalog)");
    for (const m of members) {
        const purchased = resolveSubscriptionPackage(m.subscriptions[0]);
        const stats = entitlementStats(m);
        console.log(`${m.name}:`, {
            pricePaid: m.subscriptions[0].pricePaid,
            purchasedName: purchased.name,
            purchasedPrice: purchased.price,
            purchasedFreezeLimit: purchased.freezeLimitDays,
            purchasedInvitationLimit: purchased.invitationLimit,
            freezeDaysRemaining: stats.freezeDaysRemaining,
            invitationsRemaining: stats.invitationsRemaining,
            liveCatalogFreeze: stats.liveFreezeLimit,
            liveCatalogInvites: stats.liveInvitationLimit,
        });

        assert(purchased.freezeLimitDays === 10, `${m.name} freeze limit should stay 10`);
        assert(purchased.invitationLimit === 2, `${m.name} invitation limit should stay 2`);
        assert(purchased.price === 3000, `${m.name} snapshot price should stay 3000`);
        assert(purchased.name === "Gym 3 Months", `${m.name} package name should stay original`);
        // Live catalog changed — must not be used for old members' entitlements
        assert(stats.liveFreezeLimit === 30, "live ref should reflect catalog freeze 30");
        assert(stats.liveInvitationLimit === 5, "live ref should reflect catalog invitations 5");
        assert(stats.freezeLimitDays === 10, "entitlement freeze must use snapshot 10");
        assert(stats.invitationLimit === 2, "entitlement invitations must use snapshot 2");
    }

    // Karim used 3 freeze days + 1 invitation against original 10 / 2
    const karimAfter = entitlementStats(members[0]);
    assert(karimAfter.freezeDaysRemaining === 7, "Karim freeze remaining should stay 7 (10-3), not 27");
    assert(karimAfter.invitationsRemaining === 1, "Karim invitations remaining should stay 1 (2-1), not 4");
    console.log("\nKarim remaining after catalog edit (must match original allowance):", {
        freezeDaysRemaining: karimAfter.freezeDaysRemaining,
        invitationsRemaining: karimAfter.invitationsRemaining,
    });

    line("4) Total revenue must not be manipulated by catalog price change");
    revenue = aggregateSubscriptionRevenue(members);
    const buggy = aggregateRevenueFromLiveCatalogPrice(members);
    console.log("Correct total revenue (pricePaid):", revenue.totalRevenue);
    console.log("Buggy total if live catalog price were used:", buggy);
    console.log("memberPrice(Karim):", memberPrice(members[0]));

    assert(revenue.totalRevenue === 6000, `expected total revenue 6000, got ${revenue.totalRevenue}`);
    assert(buggy !== revenue.totalRevenue, "buggy live-catalog revenue unexpectedly matched payment revenue");

    line("5) New member after change gets NEW freeze/invitation terms; old stay frozen");
    members.push(purchase("Omar", catalog, catalog.price));
    const omar = entitlementStats(members[2]);
    revenue = aggregateSubscriptionRevenue(members);
    console.log("Omar purchased terms:", {
        pricePaid: members[2].subscriptions[0].pricePaid,
        freezeLimitDays: omar.freezeLimitDays,
        invitationLimit: omar.invitationLimit,
    });
    console.log("Karim still:", {
        pricePaid: members[0].subscriptions[0].pricePaid,
        freezeLimitDays: entitlementStats(members[0]).freezeLimitDays,
        invitationLimit: entitlementStats(members[0]).invitationLimit,
    });
    console.log("New total revenue:", revenue.totalRevenue, "(expected 11000)");

    assert(omar.freezeLimitDays === 30, "Omar should get new freeze limit 30");
    assert(omar.invitationLimit === 5, "Omar should get new invitation limit 5");
    assert(entitlementStats(members[0]).freezeLimitDays === 10, "Karim freeze stays 10");
    assert(entitlementStats(members[0]).invitationLimit === 2, "Karim invitations stay 2");
    assert(revenue.totalRevenue === 11000, `expected total revenue 11000, got ${revenue.totalRevenue}`);

    console.log("\nOK — price, freeze allowance, invitations, and revenue stayed immutable for old members.\n");
}

main();
