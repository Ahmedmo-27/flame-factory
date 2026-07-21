/**
 * Scenario tests: member purchase → sales-manager catalog edit → history/revenue stay frozen.
 *
 * Simulates the bug where editing a package price would rewrite old members' payment
 * terms and inflate/deflate total revenue if live catalog prices were used.
 */

const { buildPackageSnapshot, resolveSubscriptionPackage } = require("./packageSnapshot");
const {
    memberPrice,
    subscriptionSalePrice,
    aggregateSubscriptionRevenue,
    aggregateRevenueFromLiveCatalogPrice,
    getCurrentPackage,
} = require("./revenueUtils");

const ORIGINAL_PACKAGE = {
    _id: "catalog-gym-3m",
    name: "Gym 3 Months",
    activityType: "gym",
    duration: "3 months",
    price: 3000,
    freezeLimitDays: 10,
    invitationLimit: 2,
    renewalDiscountPercent: 10,
    description: "Standard gym",
    hasException: false,
    free_pt_sessions: 1,
    isActive: true,
};

function purchaseSubscription({ catalogPkg, pricePaid, startDate = "2026-01-15", memberId = "m1" }) {
    const snap = buildPackageSnapshot(catalogPkg);
    return {
        _id: `sub-${memberId}`,
        subscriptionId: 100 + Number(String(memberId).replace(/\D/g, "") || 1),
        package: { ...catalogPkg }, // populated live ref (same object shape as DB populate)
        packageSnapshot: snap,
        startDate: new Date(startDate),
        endDate: new Date("2026-04-15"),
        pricePaid,
        discountPercent: 0,
        isRenewal: false,
        createdBy: "accountant-1",
        approvedBy: "accountant-1",
    };
}

function applyCatalogUpdate(catalogPkg, changes) {
    // Simulates PATCH /api/packages/:id by sales manager — mutates the live catalog doc
    Object.assign(catalogPkg, changes);
    return catalogPkg;
}

function syncLiveRefsFromCatalog(members, catalogPkg) {
    // After a catalog update, populated package refs on subscriptions would reflect new values
    for (const member of members) {
        for (const sub of member.subscriptions || []) {
            if (sub.package?._id === catalogPkg._id || sub.package === catalogPkg._id) {
                sub.package = { ...catalogPkg };
            }
        }
    }
}

describe("purchased package immutability (purchase → catalog edit)", () => {
    let catalogPkg;
    let oldMember;
    let anotherOldMember;

    beforeEach(() => {
        catalogPkg = { ...ORIGINAL_PACKAGE };

        // Two members purchased at the original catalog price
        oldMember = {
            _id: "member-old-1",
            name: "Karim",
            subscriptions: [
                purchaseSubscription({
                    catalogPkg,
                    pricePaid: catalogPkg.price, // paid 3000
                    memberId: "1",
                    startDate: "2026-01-10",
                }),
            ],
        };

        anotherOldMember = {
            _id: "member-old-2",
            name: "Nour",
            subscriptions: [
                purchaseSubscription({
                    catalogPkg,
                    pricePaid: catalogPkg.price, // paid 3000
                    memberId: "2",
                    startDate: "2026-02-01",
                }),
            ],
        };
    });

    it("saves payment record + package snapshot at purchase time", () => {
        const sub = oldMember.subscriptions[0];

        expect(sub.pricePaid).toBe(3000);
        expect(sub.packageSnapshot).toMatchObject({
            name: "Gym 3 Months",
            price: 3000,
            duration: "3 months",
            freezeLimitDays: 10,
            invitationLimit: 2,
            renewalDiscountPercent: 10,
        });
    });

    it("keeps snapshot and pricePaid when sales manager changes package price and terms", () => {
        // Sales manager edits the catalog package
        applyCatalogUpdate(catalogPkg, {
            name: "Gym 3 Months PRO",
            price: 5000,
            freezeLimitDays: 30,
            invitationLimit: 5,
            renewalDiscountPercent: 25,
            description: "Updated offer",
        });
        syncLiveRefsFromCatalog([oldMember, anotherOldMember], catalogPkg);

        const sub = oldMember.subscriptions[0];
        const purchased = resolveSubscriptionPackage(sub);

        // Payment record unchanged
        expect(sub.pricePaid).toBe(3000);

        // Snapshot unchanged
        expect(sub.packageSnapshot.price).toBe(3000);
        expect(sub.packageSnapshot.name).toBe("Gym 3 Months");
        expect(sub.packageSnapshot.freezeLimitDays).toBe(10);
        expect(sub.packageSnapshot.invitationLimit).toBe(2);

        // Resolved "what the member paid for" still original terms
        expect(purchased.price).toBe(3000);
        expect(purchased.name).toBe("Gym 3 Months");
        expect(purchased.freezeLimitDays).toBe(10);
        expect(purchased.invitationLimit).toBe(2);
        expect(purchased.renewalDiscountPercent).toBe(10);

        // Live catalog did change
        expect(catalogPkg.price).toBe(5000);
        expect(sub.package.price).toBe(5000);
    });

    it("does not manipulate total revenue when catalog prices change for old members", () => {
        const members = [oldMember, anotherOldMember];

        const before = aggregateSubscriptionRevenue(members);
        expect(before.totalRevenue).toBe(6000); // 3000 + 3000
        expect(before.salesCount).toBe(2);

        // Sales manager raises catalog price
        applyCatalogUpdate(catalogPkg, { price: 9000, name: "Expensive Gym" });
        syncLiveRefsFromCatalog(members, catalogPkg);

        const after = aggregateSubscriptionRevenue(members);

        // Correct path: still 6000 from payment records
        expect(after.totalRevenue).toBe(6000);
        expect(after.salesCount).toBe(2);
        expect(memberPrice(oldMember)).toBe(3000);
        expect(memberPrice(anotherOldMember)).toBe(3000);

        // Incorrect path (live catalog) would wrongly inflate revenue — the bug we prevent
        const buggyRevenue = aggregateRevenueFromLiveCatalogPrice(members);
        expect(buggyRevenue).toBe(18000); // 9000 + 9000 — must NOT be used
        expect(after.totalRevenue).not.toBe(buggyRevenue);
    });

    it("keeps revenue stable when catalog price is lowered", () => {
        const members = [oldMember, anotherOldMember];
        expect(aggregateSubscriptionRevenue(members).totalRevenue).toBe(6000);

        applyCatalogUpdate(catalogPkg, { price: 1000 });
        syncLiveRefsFromCatalog(members, catalogPkg);

        expect(aggregateSubscriptionRevenue(members).totalRevenue).toBe(6000);
        expect(aggregateRevenueFromLiveCatalogPrice(members)).toBe(2000);
    });

    it("uses original freeze/invitation limits for old members after catalog limit changes", () => {
        applyCatalogUpdate(catalogPkg, {
            freezeLimitDays: 99,
            invitationLimit: 50,
        });
        syncLiveRefsFromCatalog([oldMember], catalogPkg);

        const currentPkg = getCurrentPackage(oldMember);
        expect(currentPkg.freezeLimitDays).toBe(10);
        expect(currentPkg.invitationLimit).toBe(2);
    });

    it("freeze remaining days still use purchased allowance after catalog freeze increase", () => {
        // Member already used 3 freeze days against original 10-day allowance
        oldMember.freezeDaysUsed = 3;

        applyCatalogUpdate(catalogPkg, { freezeLimitDays: 30 });
        syncLiveRefsFromCatalog([oldMember], catalogPkg);

        const currentPkg = getCurrentPackage(oldMember);
        const freezeDaysRemaining = (currentPkg?.freezeLimitDays || 0) - oldMember.freezeDaysUsed;

        // Must remain 7 (10 - 3), not 27 (30 - 3) from the new catalog
        expect(currentPkg.freezeLimitDays).toBe(10);
        expect(freezeDaysRemaining).toBe(7);
        expect(oldMember.subscriptions[0].package.freezeLimitDays).toBe(30);
    });

    it("invitation remaining slots still use purchased allowance after catalog invitation increase", () => {
        oldMember.invitationsUsed = 1;

        applyCatalogUpdate(catalogPkg, { invitationLimit: 10 });
        syncLiveRefsFromCatalog([oldMember], catalogPkg);

        const currentPkg = getCurrentPackage(oldMember);
        const invitationsRemaining = (currentPkg?.invitationLimit || 0) - oldMember.invitationsUsed;

        // Must remain 1 (2 - 1), not 9 (10 - 1) from the new catalog
        expect(currentPkg.invitationLimit).toBe(2);
        expect(invitationsRemaining).toBe(1);
        expect(oldMember.subscriptions[0].package.invitationLimit).toBe(10);
    });

    it("rejects a freeze request that exceeds purchased freeze allowance even if catalog was raised", () => {
        oldMember.freezeDaysUsed = 8; // 2 days left on original 10

        applyCatalogUpdate(catalogPkg, { freezeLimitDays: 40 });
        syncLiveRefsFromCatalog([oldMember], catalogPkg);

        const currentPkg = getCurrentPackage(oldMember);
        const allowedDays = currentPkg?.freezeLimitDays || 0;
        const remainingDays = allowedDays - oldMember.freezeDaysUsed;
        const requestedDays = 5; // would pass against live 40, must fail against purchased 10

        expect(remainingDays).toBe(2);
        expect(requestedDays > remainingDays).toBe(true);
        expect(requestedDays <= (oldMember.subscriptions[0].package.freezeLimitDays - oldMember.freezeDaysUsed)).toBe(true);
    });

    it("new purchases after a price change use the new price; old members stay on old pricePaid", () => {
        applyCatalogUpdate(catalogPkg, { price: 5000 });
        syncLiveRefsFromCatalog([oldMember, anotherOldMember], catalogPkg);

        const newMember = {
            _id: "member-new",
            name: "Omar",
            subscriptions: [
                purchaseSubscription({
                    catalogPkg,
                    pricePaid: catalogPkg.price, // pays new price 5000
                    memberId: "3",
                    startDate: "2026-07-01",
                }),
            ],
        };

        const members = [oldMember, anotherOldMember, newMember];
        const { totalRevenue, salesCount } = aggregateSubscriptionRevenue(members);

        expect(oldMember.subscriptions[0].pricePaid).toBe(3000);
        expect(newMember.subscriptions[0].pricePaid).toBe(5000);
        expect(newMember.subscriptions[0].packageSnapshot.price).toBe(5000);
        expect(totalRevenue).toBe(3000 + 3000 + 5000);
        expect(salesCount).toBe(3);
    });

    it("subscriptionSalePrice never falls through to a mutated live catalog price when pricePaid exists", () => {
        const sub = oldMember.subscriptions[0];
        applyCatalogUpdate(catalogPkg, { price: 99999 });
        syncLiveRefsFromCatalog([oldMember], catalogPkg);

        expect(subscriptionSalePrice(sub)).toBe(3000);
        expect(sub.package.price).toBe(99999);
    });

    it("contract-style revenue sum uses pricePaid only (not package.price)", () => {
        // Mirrors contractController: contracts.reduce((sum, c) => sum + (c.pricePaid || 0), 0)
        applyCatalogUpdate(catalogPkg, { price: 7000 });
        syncLiveRefsFromCatalog([oldMember, anotherOldMember], catalogPkg);

        const contracts = [oldMember, anotherOldMember].flatMap((m) =>
            m.subscriptions.map((sub) => ({
                pricePaid: sub.pricePaid,
                package: resolveSubscriptionPackage(sub),
            }))
        );

        const totalRevenue = contracts.reduce((sum, c) => sum + (c.pricePaid || 0), 0);
        expect(totalRevenue).toBe(6000);
        expect(contracts.every((c) => c.package.price === 3000)).toBe(true);
    });
});
