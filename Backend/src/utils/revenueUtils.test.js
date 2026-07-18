const {
    subscriptionSalePrice,
    aggregateSubscriptionRevenue,
    aggregateRevenueFromLiveCatalogPrice,
    memberPrice,
} = require("./revenueUtils");
const { buildPackageSnapshot } = require("./packageSnapshot");

describe("revenueUtils — payment-record revenue", () => {
    const snap = buildPackageSnapshot({
        name: "Basic",
        activityType: "gym",
        duration: "1 month",
        price: 2000,
        freezeLimitDays: 5,
        invitationLimit: 1,
        renewalDiscountPercent: 0,
        hasException: false,
    });

    it("subscriptionSalePrice prefers pricePaid over snapshot and live catalog", () => {
        expect(
            subscriptionSalePrice({
                pricePaid: 1800,
                packageSnapshot: snap,
                package: { ...snap, price: 9999 },
            })
        ).toBe(1800);
    });

    it("subscriptionSalePrice falls back to packageSnapshot when pricePaid is missing", () => {
        expect(
            subscriptionSalePrice({
                packageSnapshot: snap,
                package: { ...snap, price: 9999 },
            })
        ).toBe(2000);
    });

    it("aggregateSubscriptionRevenue ignores live catalog price changes", () => {
        const members = [
            {
                subscriptions: [
                    { pricePaid: 2000, packageSnapshot: snap, package: { price: 8000 } },
                    { pricePaid: 2500, packageSnapshot: snap, package: { price: 8000 } },
                ],
            },
        ];

        expect(aggregateSubscriptionRevenue(members)).toEqual({
            totalRevenue: 4500,
            salesCount: 2,
        });
        expect(aggregateRevenueFromLiveCatalogPrice(members)).toBe(16000);
    });

    it("memberPrice uses the latest subscription payment record", () => {
        const member = {
            subscriptions: [
                { pricePaid: 1000, package: { price: 5000 } },
                { pricePaid: 1200, package: { price: 5000 } },
            ],
        };
        expect(memberPrice(member)).toBe(1200);
    });
});
