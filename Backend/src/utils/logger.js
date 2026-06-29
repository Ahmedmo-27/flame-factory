const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "../../logs");
const LOG_FILE = path.join(LOG_DIR, "app.log");
const AUTH_LOG_FILE = path.join(LOG_DIR, "auth.log");

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function ensureLogDir() {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
}

function formatLine(level, category, message, meta = {}) {
    return JSON.stringify({
        ts: new Date().toISOString(),
        level,
        category,
        message,
        env: process.env.NODE_ENV || "development",
        ...meta,
    });
}

function writeToFile(filePath, line) {
    try {
        ensureLogDir();
        fs.appendFileSync(filePath, `${line}\n`, "utf8");
    } catch (err) {
        console.error("[logger] Failed to write log file:", err.message);
    }
}

function log(level, category, message, meta = {}, options = {}) {
    if (LEVELS[level] < MIN_LEVEL) return;

    const line = formatLine(level, category, message, meta);
    const prefix = `[${level.toUpperCase()}][${category}]`;

    if (level === "error") {
        console.error(prefix, message, meta);
    } else if (level === "warn") {
        console.warn(prefix, message, meta);
    } else {
        console.log(prefix, message, Object.keys(meta).length ? meta : "");
    }

    writeToFile(LOG_FILE, line);
    if (options.auth || category === "auth") {
        writeToFile(AUTH_LOG_FILE, line);
    }
}

const logger = {
    debug: (category, message, meta, options) => log("debug", category, message, meta, options),
    info: (category, message, meta, options) => log("info", category, message, meta, options),
    warn: (category, message, meta, options) => log("warn", category, message, meta, options),
    error: (category, message, meta, options) => log("error", category, message, meta, options),
    auth: (level, message, meta = {}) => log(level, "auth", message, meta, { auth: true }),
};

module.exports = logger;
