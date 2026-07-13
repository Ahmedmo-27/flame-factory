/**
 * Strip HTML tags and neutralize common XSS vectors for plain-text fields.
 */
function sanitizePlainText(text) {
    if (typeof text !== "string") return "";
    return text
        .replace(/<[^>]*>/g, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+\s*=/gi, "")
        .trim();
}

module.exports = { sanitizePlainText };
