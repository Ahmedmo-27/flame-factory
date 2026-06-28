const mongoose = require("mongoose");
const Member = require("../models/Member");

function isObjectIdString(id) {
    const value = String(id).trim();
    if (!mongoose.Types.ObjectId.isValid(value)) return false;
    return String(new mongoose.Types.ObjectId(value)) === value;
}

function buildMemberFilter(id) {
    const value = String(id).trim();
    if (!value) return null;

    if (isObjectIdString(value)) {
        return { _id: value };
    }

    if (/^\d+$/.test(value)) {
        return { memberId: Number(value) };
    }

    return null;
}

function findMemberByIdentifier(id) {
    const filter = buildMemberFilter(id);
    if (!filter) {
        return Promise.resolve(null);
    }
    return Member.findOne(filter);
}

module.exports = {
    isObjectIdString,
    buildMemberFilter,
    findMemberByIdentifier,
};
