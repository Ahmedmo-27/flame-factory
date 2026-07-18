#!/usr/bin/env node
/**
 * Runnable simulation of:
 *  1) Members purchase a package (payment + snapshot saved)
 *  2) Sales manager changes package price / characteristics
 *  3) Old members' snapshots and total revenue stay on the original paid amounts
 *
 * Run: node scripts/simulate-package-price-immutability.js
 *  or: npm run simulate:package-immutability
 */

const { buildPackageSnapshot, resolveSubscriptionPackage } = require("../src/utils/packageSnapshot");
const {
    aggregateSubscriptionRevenue,
    aggregateRevenueFromLiveCatalogPrice,
    memberPrice,
} = require("../src/utils/revenueUtils");

function line(title) {
    console.log(`\n=== ${title} ===`);
}

function purchase(memberName, catalogPkg, pricePaid) {
    return {
        name: memberName,
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

    line("1) Members purchase at catalog price 3000");
    const members = [
        purchase("Karim", catalog, catalog.price),
        purchase("Nour", catalog, catalog.price),
    ];
    let revenue = aggregateSubscriptionRevenue(members);
    console.log("Total revenue (from pricePaid):", revenue.totalRevenue);
    console.log("Karim payment:", members[0].subscriptions[0].pricePaid);
    console.log("Karim snapshot price:", members[0].subscriptions[0].packageSnapshot.price);

    line("2) Sales manager updates catalog package (price 3000 → 5000, freeze 10 → 30)");
    Object.assign(catalog, {
        name: "Gym 3 Months PRO",
        price: 5000,
        freezeLimitDays: 30,
        invitationLimit: 5,
    });
    // Simulate populated refs refreshing to the new catalog values
    for (const m of members) {
        m.subscriptions[0].package = { ...catalog };
    }
    console.log("Live catalog price now:", catalog.price);

    line("3) Old members still see original purchased terms");
    for (const m of members) {
        const purchased = resolveSubscriptionPackage(m.subscriptions[0]);
        console.log(`${m.name}: pricePaid=${m.subscriptions[0].pricePaid}, snapshot=${purchased.price}, name=${purchased.name}, freeze=${purchased.freezeLimitDays}`);
    }

    line("4) Total revenue must not be manipulated by catalog price change");
    revenue = aggregateSubscriptionRevenue(members);
    const buggy = aggregateRevenueFromLiveCatalogPrice(members);
    console.log("Correct total revenue (pricePaid):", revenue.totalRevenue);
    console.log("Buggy total if live catalog price were used:", buggy);
    console.log("memberPrice(Karim):", memberPrice(members[0]));

    if (revenue.totalRevenue !== 6000) {
        console.error("\nFAIL: expected total revenue 6000, got", revenue.totalRevenue);
        process.exit(1);
    }
    if (buggy === revenue.totalRevenue) {
        console.error("\nFAIL: buggy live-catalog revenue unexpectedly matched payment revenue");
        process.exit(1);
    }

    line("5) New member buys after price change → pays 5000; old stay at 3000");
    members.push(purchase("Omar", catalog, catalog.price));
    revenue = aggregateSubscriptionRevenue(members);
    console.log("Karim still:", members[0].subscriptions[0].pricePaid);
    console.log("Omar paid:", members[2].subscriptions[0].pricePaid);
    console.log("New total revenue:", revenue.totalRevenue, "(expected 11000)");

    if (revenue.totalRevenue !== 11000) {
        console.error("\nFAIL: expected total revenue 11000, got", revenue.totalRevenue);
        process.exit(1);
    }

    console.log("\nOK — package snapshot and payment records stayed immutable; revenue uses old prices for old members.\n");
}

main();
