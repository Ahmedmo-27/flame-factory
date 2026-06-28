function monthKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dayKey(date = new Date()) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(date, ref = new Date()) {
    const d = new Date(date);
    return (
        d.getFullYear() === ref.getFullYear() &&
        d.getMonth() === ref.getMonth() &&
        d.getDate() === ref.getDate()
    );
}

function buildMonthlyMap(monthsBack, now = new Date()) {
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthlyMap = {};

    for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const key = monthKey(d);
        monthlyMap[key] = { month: key, revenue: 0, salesCount: 0 };
    }

    return monthlyMap;
}

function memberPrice(member) {
    return member.package?.price || 0;
}

module.exports = {
    monthKey,
    dayKey,
    isSameDay,
    buildMonthlyMap,
    memberPrice,
};
