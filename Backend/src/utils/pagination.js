function parsePagination(query, { defaultLimit = 20, maxLimit = 100, allLimit = 5000 } = {}) {
    if (query.all === "true") {
        return { page: 1, limit: allLimit, skip: 0, all: true };
    }

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
    return { page, limit, skip: (page - 1) * limit, all: false };
}

function buildPagination(page, limit, total) {
    return {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
    };
}

module.exports = { parsePagination, buildPagination };
