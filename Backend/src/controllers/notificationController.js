const Notification = require("../models/Notification");
const { parsePagination, buildPagination } = require("../utils/pagination");

const getNotifications = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 25 });

        const filter = { recipient: req.user.id };
        const [total, notifications] = await Promise.all([
            Notification.countDocuments(filter),
            Notification.find(filter)
                .populate("member", "name systemId memberId")
                .populate("createdBy", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
        ]);

        res.json({
            notifications,
            pagination: buildPagination(page, limit, total),
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({ recipient: req.user.id, read: false });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            recipient: req.user.id,
        });

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        notification.read = true;
        await notification.save();
        res.json({ message: "Notification marked as read", notification });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user.id, read: false },
            { read: true }
        );
        res.json({ message: "All notifications marked as read" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
};
