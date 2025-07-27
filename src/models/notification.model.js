import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            "TODO_LIST_DELETED",
            "COLLABORATOR_ADDED",
            "COLLABORATOR_KICKED",
            "COLLABORATOR_LEFT",
            "JOIN_REQUEST_ACCEPTED",
            "JOIN_REQUEST_REJECTED",
            "JOIN_REQUEST_SENT",
            "REQUEST_TO_JOIN",
            "TASK_ASSIGNED",
            "TASK_COMPLETED",
            "TASK_UPDATED",
            "TASK_DELETED",
            "TODO_LIST_SHARED",
            "CUSTOM",
        ],
        index: true,
    },
    title: {
        type: String,
        required: true,
        maxlength: 100,
    },
    message:{
        type: String,
        required: true,
        maxLength: 500
    },
    data: {
        // Struktur data yang lebih spesifik
        todoListId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TodoList",
        },
        taskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
        },
        fromUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        // Data tambahan dalam format flexible
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    isArchived: {
        type: Boolean,
        default: false,
        index: true
    },
    priority: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH"],
        default: "MEDIUM"
    },
    expiredAt: {
        type: Date,
        index: {
            expiredAfterSeconds: 0
        }
    }
}, {
    timestamps: true,
    indexes: [
        { user: 1, isRead: 1, createdAt: -1 },
        { user: 1, type: 1, createdAt: -1 },
    ]
});

// Vitual untuk populate data terkait
notificationSchema.virtual("todoList", {
    ref: 'TodoList',
    localField: 'data.todoListId',
    foreignField: '_id',
    justOne: true,
});

notificationSchema.virtual('task', {
    ref: 'Task',
    localField: 'data.taskId',
    foreignField: '_id',
    justOne: true,
});

notificationSchema.virtual('fromUser', {
    ref: 'User',
    localField: 'data.fromUserId',
    foreignField: '_id',
    justOne: true,
});

// Method untuk mark as read
notificationSchema.methods.markAsRead = function() {
    this.isRead = true;
    return this.save();
};

// Static method untuk cleanup expired notifications
notificationSchema.statics.cleanupExpired = function() {
    return this.deleteMany({
        expiresAt: { $lt: new Date() }
    });
};

// Static method untuk bulk mark as read
notificationSchema.statics.markAllAsRead = function(userId) {
    return this.updateMany(
        { user: userId, isRead: false },
        { isRead: true }
    );
};

// Static method untuk bulk delete notifications
notificationSchema.statics.deleteAll = function(userId) {
    return this.deleteMany({
        user: userId,
        isArchived: false,
    });
}

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;