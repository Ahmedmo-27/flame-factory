const fs = require("fs");
const os = require("os");
const path = require("path");
const { assertAllowedUpload, detectMimeFromBuffer } = require("./fileMagic");

describe("fileMagic", () => {
    it("rejects PHP content disguised as JPEG", () => {
        const mime = detectMimeFromBuffer(Buffer.from("<?php echo 'pwned'; ?>"));
        expect(mime).toBeNull();
    });

    it("accepts JPEG magic bytes", () => {
        const mime = detectMimeFromBuffer(Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
        expect(mime).toBe("image/jpeg");
    });

    it("rejects spoofed uploads on disk", async () => {
        const tmp = path.join(os.tmpdir(), `spoof-${Date.now()}.jpg`);
        await fs.promises.writeFile(tmp, "<?php echo 'pwned'; ?>");
        try {
            await expect(assertAllowedUpload(tmp)).rejects.toMatchObject({
                statusCode: 400,
            });
        } finally {
            await fs.promises.unlink(tmp);
        }
    });
});
