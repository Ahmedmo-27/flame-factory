const { assignPackageSchema } = require("./schemas");

const basePayload = {
    packageId: "507f1f77bcf86cd799439011",
    name: "Gold",
    duration: "1 month",
};

describe("assignPackageSchema", () => {
    it("rejects zero pricePaid", () => {
        const result = assignPackageSchema.safeParse({ ...basePayload, pricePaid: 0 });
        expect(result.success).toBe(false);
    });

    it("accepts positive pricePaid", () => {
        const result = assignPackageSchema.safeParse({ ...basePayload, pricePaid: 100 });
        expect(result.success).toBe(true);
    });
});
