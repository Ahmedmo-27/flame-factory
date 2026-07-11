/**
 * Per-email login lockout after repeated failures.
 * In-memory map is fine for a single Render instance.
 * Shared office IPs are not locked — only the email key is.
 */
const failures = new Map();

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

function getLockState(email) {
    if (!email) return { locked: false, count: 0 };
    const row = failures.get(email);
    if (!row) return { locked: false, count: 0 };

    if (row.lockedUntil && Date.now() < row.lockedUntil) {
        return { locked: true, count: row.count, lockedUntil: row.lockedUntil };
    }

    if (row.lockedUntil && Date.now() >= row.lockedUntil) {
        failures.delete(email);
        return { locked: false, count: 0 };
    }

    return { locked: false, count: row.count };
}

function recordLoginFailure(email) {
    if (!email) return { count: 0, lockedUntil: null };
    const prev = failures.get(email) || { count: 0 };
    const count = prev.count + 1;
    const lockedUntil = count >= MAX_FAILURES ? Date.now() + LOCK_MS : null;
    failures.set(email, { count, lockedUntil });
    return { count, lockedUntil };
}

function clearLoginFailures(email) {
    if (email) failures.delete(email);
}

module.exports = {
    getLockState,
    recordLoginFailure,
    clearLoginFailures,
    MAX_FAILURES,
    LOCK_MS,
};
