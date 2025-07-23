import express from 'express';
import { auth } from '../middlewares/authMiddleware.js';
import { deleteNotificationById, getUnreadCount, getUserNotifications, markAllNotificationAsRead, markNotificationAsRead } from '../controllers/notification.controller.js';

export const notificationRouter = express.Router();

notificationRouter.get('/', auth, getUserNotifications);
notificationRouter.get('/unread-count', auth, getUnreadCount);
notificationRouter.patch('/:notificationId/read', auth, markNotificationAsRead);
notificationRouter.patch('/mark-all-raad', auth, markAllNotificationAsRead);
notificationRouter.delete('/:notificationId', auth, deleteNotificationById);