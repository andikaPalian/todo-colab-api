import express from 'express';
import { auth } from '../middlewares/authMiddleware.js';
import { deleteAllNotificationsController, deleteNotificationById, getUnreadCount, getUserNotifications, markAllNotificationAsRead, markNotificationAsRead } from '../controllers/notification.controller.js';

export const notificationRouter = express.Router();

notificationRouter.get('/', auth, getUserNotifications);
notificationRouter.get('/unread-count', auth, getUnreadCount);
notificationRouter.patch('/:notificationId/read', auth, markNotificationAsRead);
notificationRouter.patch('/mark-all-read', auth, markAllNotificationAsRead);
notificationRouter.delete('/bulk', auth, deleteAllNotificationsController);
notificationRouter.delete('/:notificationId', auth, deleteNotificationById);