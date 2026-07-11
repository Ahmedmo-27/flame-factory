const fs = require("fs");

const ALLOWED = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
]);

/**
 * Detect MIME from magic bytes — do not trust client Content-Type or extension alone.
 */
function detectMimeFromBuffer(buf) {
    if (!buf || buf.length < 4) return null;

    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
    if (
        buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
        buf.length >= 12 &&
        buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
    ) {
        return "image/webp";
    }
    if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
        return "application/pdf";
    }
    return null;
}

async function assertAllowedUpload(filePath) {
    const fd = await fs.promises.open(filePath, "r");
    try {
        const buf = Buffer.alloc(16);
        await fd.read(buf, 0, 16, 0);
        const mime = detectMimeFromBuffer(buf);
        if (!mime || !ALLOWED.has(mime)) {
            const err = new Error("File content does not match allowed types (jpeg, png, gif, webp, pdf)");
            err.statusCode = 400;
            throw err;
        }
        return mime;
    } finally {
        await fd.close();
    }
}

module.exports = { detectMimeFromBuffer, assertAllowedUpload, ALLOWED };
