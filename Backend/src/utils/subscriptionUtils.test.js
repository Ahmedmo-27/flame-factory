const { findActiveSubscription, validateNoOverlappingSubscription } = require("./subscriptionUtils");

describe("subscriptionUtils", () => {
    const now = new Date("2026-07-13T12:00:00Z");

    it("finds an active subscription", () => {
        const subs = [{
            startDate: new Date("2026-06-01"),
            endDate: new Date("2026-08-01"),
        }];
        expect(findActiveSubscription(subs, now)).toBeTruthy();
    });

    it("rejects a package starting before active subscription ends", () => {
        const subs = [{
            startDate: new Date("2026-06-01"),
            endDate: new Date("2026-08-01"),
        }];
        const message = validateNoOverlappingSubscription(
            subs,
            new Date("2026-07-14"),
            now
        );
        expect(message).toMatch(/active subscription/i);
    });

    it("allows a package starting on the active subscription end date", () => {
        const subs = [{
            startDate: new Date("2026-06-01"),
            endDate: new Date("2026-08-01"),
        }];
        const message = validateNoOverlappingSubscription(
            subs,
            new Date("2026-08-01"),
            now
        );
        expect(message).toBeNull();
    });
});
