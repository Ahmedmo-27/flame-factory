const {
    getLockState,
    recordLoginFailure,
    clearLoginFailures,
    resetLoginLockoutState,
    MAX_FAILURES,
} = require("./loginLockout");

describe("loginLockout", () => {
    beforeEach(() => {
        resetLoginLockoutState();
    });

    it("locks after MAX_FAILURES for unknown emails", () => {
        const email = "unknown@example.com";

        for (let i = 1; i < MAX_FAILURES; i++) {
            const fail = recordLoginFailure(email);
            expect(fail.lockedUntil).toBeNull();
            expect(getLockState(email).locked).toBe(false);
        }

        const fifth = recordLoginFailure(email);
        expect(fifth.count).toBe(MAX_FAILURES);
        expect(fifth.lockedUntil).toBeTruthy();
        expect(getLockState(email).locked).toBe(true);
    });

    it("returns locked state on the 6th attempt for known emails", () => {
        const email = "known@example.com";

        for (let i = 0; i < MAX_FAILURES; i++) {
            recordLoginFailure(email);
        }

        const lock = getLockState(email);
        expect(lock.locked).toBe(true);
        expect(lock.count).toBe(MAX_FAILURES);
    });

    it("clears failures after successful login", () => {
        const email = "user@example.com";
        recordLoginFailure(email);
        recordLoginFailure(email);
        clearLoginFailures(email);
        expect(getLockState(email).locked).toBe(false);
        expect(getLockState(email).count).toBe(0);
    });
});
