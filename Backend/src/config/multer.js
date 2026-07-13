const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");

const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_EXT = new Set([".jpeg", ".jpg", ".png", ".gif", ".webp", ".pdf"]);
const ALLOWED_MIME = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
]);

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeExt = ALLOWED_EXT.has(ext) ? ext : "";
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        // Never use originalname in the stored path (path traversal / overwrite risk)
        cb(null, unique + safeExt);
    }
});

const fileFilter = (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXT.has(ext) && ALLOWED_MIME.has(file.mimetype)) {
        return cb(null, true);
    }
    cb(new Error("Only images (jpeg, png, gif, webp) and PDF files are allowed"));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB max
});

function handleUploadError(err, res) {
    if (err.name === "MulterError" && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ message: "File too large. Maximum size is 5 MB." });
    }
    return res.status(400).json({ message: err.message });
}

function uploadSingle(fieldName) {
    return (req, res, next) => {
        upload.single(fieldName)(req, res, (err) => {
            if (!err) return next();
            return handleUploadError(err, res);
        });
    };
}

module.exports = upload;
module.exports.uploadSingle = uploadSingle;
