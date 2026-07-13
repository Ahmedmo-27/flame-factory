const { isDuplicateKeyError } = require("./sequence");

describe("isDuplicateKeyError", () => {
    it("detects duplicate key errors for tracked fields", () => {
        const err = { code: 11000, keyPattern: { systemId: 1 } };
        expect(isDuplicateKeyError(err, ["systemId", "memberId"])).toBe(true);
    });

    it("ignores duplicate key errors on other fields", () => {
        const err = { code: 11000, keyPattern: { email: 1 } };
        expect(isDuplicateKeyError(err, ["systemId", "memberId"])).toBe(false);
    });
});
