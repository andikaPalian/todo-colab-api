import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxLength: 200
    },
    description: {
        type: String,
        trim: true,
        maxLength: 1000
    },
    completed: {
        type: Boolean,
        default: false,
        index: true
    },
    completedAt: {
        type: Date
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    dueDate: {
        type: Date,
        index: true
    },
    priority: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
        default: "MEDIUM",
        index: true
    },
    status: {
        type: String,
        enum: ["TODO", "IN_PROGRESS", "REVIEW", "DONE"],
        default: "TODO",
        index: true
    },
    list: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TodoList",
        required: true,
        index: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    assignedAt: {
        type: Date
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    // Untuk task yang berulang
    recurring: {
        enabled: {
            type: Boolean,
            default: false
        },
        frequency: {
            type: String,
            enum: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"],
            default: "DAILY"
        },
        interval: {
            type: Number,
            default: 1,
            min: 1
        },
        endDate: {
            type: Date
        }
    },
    // Untuk SubTask
    parentTask: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task"
    },
    subTask: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task"
    }],
    // Tags untuk kategorisasi
    tags: [{
        type: String,
        trim: true,
        maxLength: 40
    }],
    // Attachments/files
    attachments: [{
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        url: String,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Comments/notes
    comments: [{
        text: {
            type: String,
            trim: true,
            maxLength: 500
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Activity Log
    activityLog: [{
        action: {
            type: String,
            enum: ["CREATED", "UPDATED", "COMPLETED", "ASSIGNED", "COMMENTED", "ATTACHED"],
            required: true
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        details: {
            type: mongoose.Schema.Types.Mixed
        },
        timestamps: {
            type: Date,
            default: Date.now
        }
    }],
    // Soft delete
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },
    deletedAt: {
        type: Date
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, {
    timestamps: true,
    // Compound indexes untuk query yang sering digunakan
    indexes: [
        { list: 1, completed: 1, createdAt: -1 },
        { assignedTo: 1, completed: 1, dueDate: 1 },
        { list: 1, status: 1, priority: -1 },
        { dueDate: 1, completed: 1 },
        { createdBy: 1, completed: 1 }
    ]
});

// Vitual untuk check apakah task overdue
taskSchema.virtual('isOverdue').get(function() {
    if (!this.dueDate || this.completed) return false;
    return new Date() > this.dueDate;
});

// Virtual untuk menghitung progress subtasks
taskSchema.virtual('subtaskProgress').get(function() {
    if (!this.subTask || this.subTask.length === 0) return null;

    const completedSubTask = this.subTask.filter(sub => sub.completed).length;
    return {
        completed: completedSubTask,
        total: this.subTask.length,
        percentage: Math.round((completedSubTask / this.subTask.length) * 100)
    };
});

// Method untuk mark as completed
taskSchema.methods.markAsCompleted = function(userId) {
    this.completed = true,
    this.completedAt = new Date();
    this.status = "DONE";

    // Add to activity log
    this.activityLog.push({
        action: "COMPLETED",
        user: userId,
        details: {
            previousStatus: this.status
        }
    });

    return this.save();
};

// Method untuk assign task
taskSchema.methods.assignTo = function(userId, assignedBy) {
    this.assignedTo = userId,
    this.assignedBy = this.assignedBy;
    this.assignedAt = new Date();

    // Add to activity log
    this.activityLog.push({
        action: 'ASSIGNED',
        user: assignedBy,
        details: {
            assignedTo: userId
        }
    });

    return this.save();
}

// Method untuk add comment
taskSchema.methods.addComment = function(text, authorId) {
    this.comments.push({
        text,
        author: authorId
    });

    // Add to activity log
    this.activityLog.push({
        action: "COMMENTED",
        user: authorId,
        details: {
            comment: text
        }
    });

    return this.save();
};

// Method untuk soft delete
taskSchema.methods.softDelete = function(userId) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
    
    return this.save();
};

// Static method untuk get tasks by list
taskSchema.statics.getByList = function(listId, options = {}) {
    const {
        includeCompleted = true,
        includeDeleted = false,
        sortBy = 'createdAt',
        sortOrder = -1,
        assignedTo = null,
        status = null,
        priority = null
    } = options;

    const query = {
        list: listId
    };

    if (!includeCompleted) query.completed = false;
    if (!includeDeleted) query.isDeleted = false;
    if (assignedTo) query.assignedTo = assignedTo;
    if (status) query.status = status;
    if (priority) query.priority = priority;

    return this.find(query)
    .sort({ [sortBy]: sortOrder })
        .populate('assignedTo', 'username profilePicture')
        .populate('createdBy', 'username profilePicture')
        .populate('completedBy', 'username profilePicture');
};

// Static method untuk get overdue tasks
taskSchema.statics.getOverdueTask = function(userId = null) {
    const query = {
        dueDate: { $lt: new Date() },
        completed: false,
        isDeleted: false
    };

    if (userId) {
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    return this.find(query)
        .populate('assignedTo', 'username profilePicture')
        .populate('list', 'name')
        .sort({ dueDate: 1 });
};

// Pre-save middleware untuk update timestamps
taskSchema.pre('save', function(next) {
    if (this.isModified('completed') && this.completed && !this.completedAt) {
        this.completedAt = new Date();
    }
    next();
});

// Pre-find middleware untuk exclude deleted tasks by default
taskSchema.pre(/^find/, function(next) {
    if (!this.getOptions().includeDeleted) {
        this.find({ isDeleted: { $ne: true } });
    }
    next();
});

const Task = mongoose.model("Task", taskSchema);

export default Task;