const bcrypt = require("bcryptjs");
const logger = require("./logger");

const BCRYPT_ROUNDS = 10;

function inspectStoredPassword(stored) {
    if (!stored || typeof stored !== "string") {
        return {
            valid: false,
            reason: "missing_or_not_string",
            length: stored ? String(stored).length : 0,
        };
    }

    const match = stored.match(/^\$2[aby]?\$(\d+)\$/);
    if (!match) {
        return {
            valid: false,
            reason: "not_bcrypt_format",
            length: stored.length,
            prefix: stored.slice(0, 12),
        };
    }

    return {
        valid: true,
        rounds: Number(match[1]),
        length: stored.length,
        prefix: stored.slice(0, 7),
        matchesAppRounds: Number(match[1]) === BCRYPT_ROUNDS,
    };
}

async function hashPassword(password) {
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    logger.debug("auth", "Password hashed", {
        rounds: BCRYPT_ROUNDS,
        hashInspection: inspectStoredPassword(hash),
    }, { auth: true });
    return hash;
}

async function verifyPassword(plainPassword, storedPassword, context = {}) {
    const inspection = inspectStoredPassword(storedPassword);

    if (!inspection.valid) {
        logger.warn("auth", "Stored password is not a bcrypt hash", {
            ...context,
            inspection,
        }, { auth: true });
        return { match: false, inspection, compareSkipped: true };
    }

    if (!inspection.matchesAppRounds) {
        logger.warn("auth", "Stored password bcrypt rounds differ from app default", {
            ...context,
            storedRounds: inspection.rounds,
            appRounds: BCRYPT_ROUNDS,
        }, { auth: true });
    }

    const match = await bcrypt.compare(plainPassword, storedPassword);

    logger.auth("info", "Password compare completed", {
        ...context,
        match,
        inspection,
    });

    return { match, inspection };
}

function normalizeEmail(email) {
    if (!email || typeof email !== "string") return "";
    return email.trim().toLowerCase();
}

module.exports = {
    BCRYPT_ROUNDS,
    hashPassword,
    verifyPassword,
    inspectStoredPassword,
    normalizeEmail,
};
