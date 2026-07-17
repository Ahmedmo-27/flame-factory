const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const crypto  = require("crypto");

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

/** Profile photos: images only, no GIF/PDF, tighter size. */
const PHOTO_EXT = new Set([".jpeg", ".jpg", ".png", ".webp"]);
const PHOTO_MIME = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
]);

const FIELD_PREFIX = {
    photoFile: "photo-",
    nationalIdFile: "nid-",
    idFile: "inv-",
};

function makeFilename(file, prefix = "") {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXT.has(ext) ? ext : "";
    const unique = crypto.randomBytes(16).toString("hex");
    return `${prefix}${unique}${safeExt}`;
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const prefix = FIELD_PREFIX[file.fieldname] || "";
        cb(null, makeFilename(file, prefix));
    }
});

const fileFilter = (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXT.has(ext) && ALLOWED_MIME.has(file.mimetype)) {
        return cb(null, true);
    }
    cb(new Error("Only images (jpeg, png, gif, webp) and PDF files are allowed"));
};

const photoFileFilter = (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (PHOTO_EXT.has(ext) && PHOTO_MIME.has(file.mimetype)) {
        return cb(null, true);
    }
    cb(new Error("Profile photo must be jpeg, png, or webp"));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB max (national ID / invitations)
});

const photoUpload = multer({
    storage,
    fileFilter: photoFileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2 MB max for profile photos
});

function handleUploadError(err, res) {
    if (err.name === "MulterError" && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ message: "File too large. Maximum size is 5 MB." });
    }
    return res.status(400).json({ message: err.message });
}

function handlePhotoUploadError(err, res) {
    if (err.name === "MulterError" && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ message: "Profile photo too large. Maximum size is 2 MB." });
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

/** Stricter uploader for member profile photos (no GIF/PDF, 2 MB). */
function uploadSinglePhoto(fieldName = "photoFile") {
    return (req, res, next) => {
        photoUpload.single(fieldName)(req, res, (err) => {
            if (!err) return next();
            return handlePhotoUploadError(err, res);
        });
    };
}

module.exports = upload;
module.exports.uploadSingle = uploadSingle;
module.exports.uploadSinglePhoto = uploadSinglePhoto;
module.exports.uploadDir = uploadDir;
