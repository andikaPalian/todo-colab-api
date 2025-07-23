import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { cleanupExpiredNotifications } from '../services/notification.service.js';

// Store active connections
const activeConnections = new Map();

// Socket.IO authentication middleware

const authenticateSocket = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return next(new Error('Authentication error: User not found'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
    } catch (error) {
        console.error("Socket authentication error: ", error);
        next(new Error('Authentication error: Invalid token'));
    }
};

// Setup Socket.IO event handlers
export const setupSocketIO = (io) => {
    // Auhentication middleware
    io.use(authenticateSocket);

    io.on('connection', (socket) => {
        console.log(`User ${socket.user.username} connected (${socket.id})`);

        // Join user to their personal room
        socket.join(`user_${socket.userId}`);

        // Store connection info
        activeConnections.set(socket.userId, {
            socketId: socket.id,
            userId: socket.userId,
            username: socket.user.username,
            connectedAt: new Date()
        });

        // Emit connection status to user
        socket.emit('connection_status', {
            status: 'connected',
            userId: socket.userId,
            timestamp: new Date()
        });

        // Handle joining todo list rooms
        socket.on("join_todoList", (todoListId) => {
            socket.join(`todoList_${todoListId}`);
            console.log(`User ${socket.user.username} joined todoList room: ${todoListId}`);

            // Notify others in the room
            socket.to(`todoList_${todoListId}`).emit('user_joined_todoList', {
                userId: socket.userId,
                username: socket.user.username,
                todoListId,
                timestamp: new Date()
            });
        });

        // Handle leaving todo list rooms
        socket.on("leave_todoList", (todoListId) => {
            socket.leave(`todoList_${todoListId}`);
            console.log(`User ${socket.user.username} left todoList room: ${todoListId}`);

            // Notify others in the room
            socket.to(`todoList_${todoListId}`).emit('user_left_todoList', {
                userId: socket.userId,
                username: socket.user.username,
                todoListId,
                timestamp: new Date()
            });
        });

        // Handle real-time task updates
        socket.on('task_update', (data) => {
            const {todoListId, taskId, action, taskData} = data;

            // Broadcast to all users in the todo list room except sender
            socket.to(`todoList_${todoListId}`).emit('task_updated', {
                taskId,
                action, // 'created', 'updated', 'deleted', 'completed'
                taskData,
                updateBy: {
                    userId: socket.userId,
                    username: socket.user.username
                },
                timestamp: new Date()
            });
        });

        // Handle typing indicators
        socket.on('typing', (data) => {
            const {todoListId, isTyping} = data;

            socket.to(`todoList_${todoListId}`).emit('user_typing', {
                userId: socket.userId,
                username: socket.user.username,
                isTyping,
                timestamp: new Date()
            });
        });

        // Handle notification acknowledgment
        socket.on('notification_ack', (notificationId) => {
            console.log(`Notification ${notificationId} acknowledged by user ${socket.user.username}`);

            // Can be used to update notification status or perform other actions
        });

        // Handle getting online users for a todo list
        socket.on('get_online_users', (todoListId) => {
            const room = io.sockets.adapter.rooms.get(`todoList_${todoListId}`);
            const onlineUsers = [];

            if (room) {
                room.forEach(socketId => {
                    const socketInstance = io.sockets.sockets.get(socketId);
                    if (socketInstance && socketInstance.userId) {
                        onlineUsers.push({
                            userId: socketInstance.userId,
                            username: socketInstance.user.username,
                            socketId: socketId
                        });
                    }
                });
            }

            socket.emit('online_users', {
                todoListId,
                users: onlineUsers,
                count: onlineUsers.length
            });
        });

        // Handle disconnect
        socket.on('disconnect', (reason) => {
            console.log(`User ${socket.user.username} disconnected (${socket.id}): ${reason}`);

            // Remover from active connection
            activeConnections.delete(socket.userId);

            // Notify all rooms this user was in
            socket.rooms.forEach(room => {
                if (room.startsWith('todoList_')) {
                    socket.to(room).emit('user_disconnected', {
                        userId: socket.userId,
                        username: socket.user.username,
                        reason,
                        timestamp: new Date()
                    });
                }
            });
        });

        // Handle connection error
        socket.on('error', (error) => {
            console.error(`Socket error for user ${socket.user.username}: `, error);
        });
    });

    // Cleanup expired notifications every hour
    setInterval(async () => {
        try {
            await cleanupExpiredNotifications();
        } catch (error) {
            console.error("Error cleaning up expired notifications: ", error);
        }
    }, 60 * 60 * 1000); // 1 hour

    // Emit server stats every 5 minutes (optional)
    setInterval(() => {
        const stats = {
            totalConnections: activeConnections.size,
            timestamp: new Date()
        };

        io.emit('server_stats', stats);
    }, 5 * 60 * 1000); // 5 minutes
};

// Helper function to get active connections
export const getActiveConnections = () => {
    return Array.from(activeConnections.values());
};

// Helper function to check if user is online
export const isUserOnline = (userId) => {
    return activeConnections.has(userId);
};

// Helper function to emit to specific user
export const emitToUser = (io, userId, event, data) => {
    io.to(`user_${userId}`).emit(event, data);
};

// Helper function to emit to specific todo list
export const emitToTodoList = (io, todoListId, event, data) => {
    io.to(`todoList_${todoListId}`).emit(event, data);
};