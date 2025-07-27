import { getNotifications, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications } from "../services/notification.service.js";

export const getUserNotifications = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        
        const notifications = await getNotifications(userId, req.query);

        return res.status(200).json({
            succcess: true,
            message: "Notifications fetched successfully",
            notifications
        });
    } catch (error) {
        next(error);
    }
};

export const getUnreadCount = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const result = await getNotifications(userId, {
            page: 1,
            limit: 1,
            unreadOnly: true
        });

        return res.status(200).json({
            success: true,
            message: "Successfully fetched unread count",
            unreadCount: result.unreadCount
        });
    } catch (error) {
        next(error);
    }
};

export const markNotificationAsRead = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {notificationId} = req.params;

        const notification = await markAsRead(userId, notificationId);

        return res.status(200).json({
            success: true,
            message: "Successfully marked notification as read",
            notification
        });
    } catch (error) {
        next(error);
    }
};

export const markAllNotificationAsRead = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        await markAllAsRead(userId);

        return res.status(200).json({
            success: true,
            message: "Successfully marked all notifications as read"
        });
    } catch (error) {
        next(error);
    }
};

export const deleteNotificationById = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {notificationId} = req.params;

        await deleteNotification(userId, notificationId);

        return res.status(200).json({
            success: true,
            message: "Successfully deleted notification"
        });
    } catch (error) {
        next(error);
    }
};

export const deleteAllNotificationsController = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        await deleteAllNotifications(userId);

        return res.status(200).json({
            success: true,
            message: "Successfully deleted all notifications"
        });
    } catch (error) {
        next(error);
    }
};