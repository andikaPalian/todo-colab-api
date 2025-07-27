import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import { AppError } from "../utils/errorHandler.js";
import { io } from "../../server.js";

// Notification Types Constants
export const NOTIFICATION_TYPES = {
    TODO_LIST_DELETED: "TODO_LIST_DELETED",
    COLLABORATOR_ADDED: "COLLABORATOR_ADDED",
    COLLABORATOR_KICKED: "COLLABORATOR_KICKED",
    COLLABORATOR_LEFT: "COLLABORATOR_LEFT",
    JOIN_REQUEST_ACCEPTED: "JOIN_REQUEST_ACCEPTED",
    TASK_ASSIGNED: "TASK_ASSIGNED",
    TASK_COMPLETED: "TASK_COMPLETED",
    TASK_UPDATED: "TASK_UPDATED",
    TASK_DELETED: "TASK_DELETED",
    TODO_LIST_SHARED: "TODO_LIST_SHARED",
    CUSTOM: "CUSTOM",
};

// Notification Priority
export const NOTIFICATION_PRIORITY = {
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
};

export const createNotification = async ({userId, type, title, message, data = {}, priority = NOTIFICATION_PRIORITY.MEDIUM, expiredAt = null}) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const notification = await Notification.create({
            user: userId,
            type,
            title,
            message,
            data,
            priority,
            expiredAt
        });

        // Emit real-time notification via Socket.IO
        io.to(`user_${userId}`).emit("notification", {
            id: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            priority: notification.priority,
            data: notification.data,
            createdAt: notification.createdAt
        });

        return notification;
    } catch (error) {
        console.error("Error creating notification: ", error);
        throw error;
    }
};

// Bulk create notification for multiple users
export const createBulkNotifications = async (notifications) => {
    try {
        const createdNotifications = await Notification.insertMany(notifications);

        // Emit to all users
        createdNotifications.forEach(notification => {
            io.to(`user_${notification.user}`).emit("notification", {
                id: notification._id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                priority: notification.priority,
                data: notification.data,
                createdAt: notification.createdAt 
            });
        });

        return createdNotifications;
    } catch (error) {
        console.error("Error creating bulk notifications: ", error);
        throw error;
    }
};

export const getNotifications = async (userId, {page = 1, limit = 10, unreadOnly = false}) => {
    try {
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const filter = {user: userId};
        if (unreadOnly) {
            filter.isRead = false;
        }

        const notifications = await Notification.find(filter)
        .sort({createdAt: -1})
        .skip(skip)
        .limit(limitNum)
        .populate('data.fromUserId', 'username profilePicture')
        .populate('data.todoListId', 'name')
        .populate('data.taskId', 'title')
        .exec();

        const total = await Notification.countDocuments(filter);
        const unreadCount = await Notification.countDocuments({
            user: userId,
            isRead: false
        });

        return {
            notifications,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            },
            unreadCount
        };
    } catch (error) {
        console.error("Error fetching notifications: ", error);
        throw error;
    }
};

export const markAsRead = async (userId, notificationId) => {
    try {
        const notification = await Notification.findOne({
            _id: notificationId,
            user: userId
        });
        if (!notification) {
            throw new AppError("Notification not found", 404);
        }

        await notification.markAsRead();

        // Emit update to user
        io.to(`user_${userId}`).emit("notification_read", {
            notificationId,
            unreadCount: await Notification.countDocuments({
                user: userId,
                isRead: false
            })
        });

        return notification;
    } catch (error) {
        console.error("Error working notification as read: ", error);
        throw error;
    }
};

export const markAllAsRead = async (userId) => {
    try {
        await Notification.markAllAsRead(userId);

        // Emit update to user
        io.to(`user_${userId}`).emit("all_notifications_read", {
            unreadCount: 0
        });

        return {
            success: true
        };
    } catch (error) {
        console.error("Error working all notifications as read: ", error);
        throw error;
    }
};

export const deleteNotification = async (userId, notificationId) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: notificationId,
            user: userId
        });
        if (!notification) {
            throw new AppError("Notification not found or not yours", 404);
        }

        // Emit update to user
        io.to(`user_${userId}`).emit("notification_deleted", {
            notificationId
        });
    } catch (error) {
        console.error("Error deleting notification: ", error);
        throw error;
    }
};

export const notifyTodoListDeleted = async (collaboratorIds, todoListName, ownerName) => {
    const notifications = collaboratorIds.map(collaboratorId => ({
        user: collaboratorId,
        type: NOTIFICATION_TYPES.TODO_LIST_DELETED,
        title: "Todo List Deleted",
        message: `"${todoListName}" has been deleted by ${ownerName}`,
        priority: NOTIFICATION_PRIORITY.MEDIUM,
        data: {
            todoListName,
            fromUserId: null  // Owner might not exist anymore
        },
    }));

    return createBulkNotifications(notifications);
};

export const notifyCollaboratorsAdded = async (collaboratorId, todoListId, todoListName, addedByName) => {
    return createNotification({
        userId: collaboratorId,
        type: NOTIFICATION_TYPES.COLLABORATOR_ADDED,
        title: "Added to Todo List",
        message: `You have been added to "${todoListName}" by ${addedByName}`,
        priority: NOTIFICATION_PRIORITY.MEDIUM,
        data: {
            todoListId,
            todoListName,
            addedByName
        }
    });
};

export const notifyCollaboratorKicked = async (collaboratorId, todoListName, kickedByName) => {
    return createNotification({
        userId: collaboratorId,
        type: NOTIFICATION_TYPES.COLLABORATOR_KICKED,
        title: "Kicked from Todo List",
        message: `You have been kicked from "${todoListName}" by ${kickedByName}`,
        priority: NOTIFICATION_PRIORITY.HIGH,
        data: {
            todoListName,
            kickedByName
        }
    });
};

export const notifyCollaboratorLeft = async (ownerId, collaboratorName, todoListName) => {
    return createNotification({
        userId: ownerId,
        type: NOTIFICATION_TYPES.COLLABORATOR_LEFT,
        title: "Collaborator Left",
        message: `${collaboratorName} has left "${todoListName}"`,
        priority: NOTIFICATION_PRIORITY.LOW,
        data: {
            collaboratorName,
            todoListName
        }
    });
};

export const notifyCollaboratorJoinned = async (ownerId, collaboratorName, todoListName) => {
    return createNotification({
        userId: ownerId,
        type: NOTIFICATION_TYPES.JOIN_REQUEST_ACCEPTED,
        title: "Collaborator Joined",
        message: `${collaboratorName} has joined "${todoListName}"`,
        priority: NOTIFICATION_PRIORITY.LOW,
        data: {
            collaboratorName,
            todoListName
        }
    });
};

export const notifyTaskAssigned = async (assignedId, taskTitle, todoLisName, assignedByName) => {
    return createNotification({
        userId: assignedId,
        type: NOTIFICATION_TYPES.TASK_ASSIGNED,
        title: "Task Assigned",
        message: `You have been assigned to "${taskTitle}" in "${todoLisName}" by ${assignedByName}`,
        priority: NOTIFICATION_PRIORITY.MEDIUM,
        data: {
            taskTitle,
            todoLisName,
            assignedByName
        }
    });
};

export const notifyTaskCompleted = async (completedId, taskTitle, todoListName, completedByName) => {
    return createNotification({
        userId: completedId,
        type: NOTIFICATION_TYPES.TASK_COMPLETED,
        title: "Task Completed",
        message: `You have completed "${taskTitle}" in "${todoListName}" by ${completedByName}`,
        priority: NOTIFICATION_PRIORITY.MEDIUM,
        data: {
            taskTitle,
            todoListName,
            completedByName
        }
    });
};

export const notifyTaskUpdated = async (updatedId, taskTitle, todoListName, updatedByName) => {
    return createNotification({
        userId: updatedId,
        type: NOTIFICATION_TYPES.TASK_UPDATED,
        title: "Task Updated",
        message: `You have updated "${taskTitle}" in "${todoListName}" by ${updatedByName}`,
        priority: NOTIFICATION_PRIORITY.MEDIUM,
        data: {
            taskTitle,
            todoListName,
            updatedByName
        }
    });
};

export const notifyTaskDeleted = async (deletedId, taskTitle, todoListName, deletedByName) => {
    return createNotification({
        userId: deletedId,
        type: NOTIFICATION_TYPES.TASK_DELETED,
        title: "Task Deleted",
        message: `You have deleted "${taskTitle}" in "${todoListName}" by ${deletedByName}`,
        priority: NOTIFICATION_PRIORITY.MEDIUM,
        data: {
            taskTitle,
            todoListName,
            deletedByName
        }
    });
};

export const cleanupExpiredNotifications = async () => {
    try {
        const result = await Notification.cleanupExpired();
        console.log(`Cleaned up ${result.deletedCount} expired notifications`);
        return result;
    } catch (error) {
        console.error("Error cleaning up expired notifications: ", error);
        throw error;
    }
};