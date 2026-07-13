const errorHandler = require("./errorHandler");

describe("errorHandler", () => {
    it("returns 413 for Multer LIMIT_FILE_SIZE errors", () => {
        const err = new Error("File too large");
        err.name = "MulterError";
        err.code = "LIMIT_FILE_SIZE";

        const req = { originalUrl: "/api/members/1/invitations", method: "POST" };
        const res = {
            headersSent: false,
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };

        errorHandler(err, req, res, () => {});

        expect(res.status).toHaveBeenCalledWith(413);
        expect(res.json).toHaveBeenCalledWith({
            message: "File too large. Maximum size is 5 MB.",
        });
    });
});
