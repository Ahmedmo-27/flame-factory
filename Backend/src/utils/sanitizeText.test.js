const { sanitizePlainText } = require("./sanitizeText");

describe("sanitizePlainText", () => {
    it("strips script tags from stored text", () => {
        const input = '<script>alert("xss")</script>Hello';
        expect(sanitizePlainText(input)).toBe('alert("xss")Hello');
    });

    it("removes HTML tags while keeping inner text", () => {
        expect(sanitizePlainText("<b>note</b>")).toBe("note");
    });

    it("neutralizes javascript: URIs", () => {
        expect(sanitizePlainText("javascript:alert(1)")).toBe("alert(1)");
    });
});
