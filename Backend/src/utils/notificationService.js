const Notification = require("../models/Notification");

async function notifyMemberAssigned({ recipientId, member, actorId }) {
    if (!recipientId || !member) return null;

    const recipientStr = recipientId.toString();
    if (actorId && recipientStr === actorId.toString()) return null;

    const memberName = member.name || "A member";
    return Notification.create({
        recipient: recipientId,
        type: "member_assigned",
        title: "New member assigned",
        message: `${memberName} has been assigned to you`,
        member: member._id,
        createdBy: actorId || null,
    });
}

module.exports = { notifyMemberAssigned };
