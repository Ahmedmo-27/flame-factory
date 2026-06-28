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

function getCurrentSubscription(member) {
    const subs = member.subscriptions;
    if (!subs?.length) return null;
    return subs[subs.length - 1];
}

function getCurrentPackage(member) {
    const sub = getCurrentSubscription(member);
    if (!sub?.package) return null;
    return typeof sub.package === "object" ? sub.package : null;
}

function memberPrice(member) {
    const sub = getCurrentSubscription(member);
    if (sub?.pricePaid) return sub.pricePaid;
    const pkg = getCurrentPackage(member);
    return pkg?.price || 0;
}

function attachCurrentPackage(memberObj) {
    const pkg = getCurrentPackage(memberObj);
    if (pkg) {
        memberObj.package = pkg;
    }
    return memberObj;
}

module.exports = {
    monthKey,
    dayKey,
    isSameDay,
    buildMonthlyMap,
    getCurrentSubscription,
    getCurrentPackage,
    memberPrice,
    attachCurrentPackage,
};
