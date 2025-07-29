import TodoList from "../models/toDoList.model.js";
import Task from "../models/task.model.js";
import User from "../models/user.model.js";
import { AppError } from "../utils/errorHandler.js";
import { notifyTaskAssigned, notifyTaskCompleted, notifyTaskDeleted, notifyTaskUpdated, createNotification, createBulkNotifications } from "./notification.service.js";

// Task Priority Constants
export const TASK_PRIORITY = {
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    URGENT: "URGENT"
};

// Task Status Constans
export const TASK_STATUS = {
    TODO: "TODO",
    IN_PROGRESS: "IN_PROGRESS",
    REVIEW: "REVIEW",
    DONE: "DONE"
};

export const createTask = async (userId, todoListId, taskData) => {
    try {
        const todoList = await TodoList.findById(todoListId);
        if (!todoList) {
            throw new AppError("Todo list not found", 404);
        }

        const {
            title,
            description,
            dueDate,
            priority = TASK_PRIORITY.MEDIUM,
            status = TASK_STATUS.TODO,
            assignedTo,
            tags = [],
            parentTask = null
        } = taskData;

        // Check if user has access to this todo list
        const isOwner = todoList.owner.toString() === userId.toString();
        const isCollaborator = todoList.collaborators.some((collab) => collab.toString() === userId.toString());
        if (!isOwner && !isCollaborator) {
            throw new AppError("You don't have access to this todo list", 403);
        }

        // Valiable assignedTo if provided
        if (assignedTo) {
            const asiignee = await User.findById(assignedTo);
            if (!asiignee) {
                throw new AppError("Assignee user not found", 404);
            }
        };

        // Create Task
        const task = await Task.create({
            title,
            description,
            dueDate,
            priority,
            status,
            list: todoListId,
            assignedTo,
            assignedBy: assignedTo ? userId : null,
            assignedAt: assignedTo ? new Date() : null,
            createdBy: userId,
            tags,
            parentTask,
            activityLog: [{
                action: "CREATED",
                user: userId,
                details: {
                    title,
                    priority,
                    status
                }
            }]
        });

        // Add task to todo list
        todoList.tasks.push(task._id);
        await todoList.save();

        // If task is assigned, notify assignee
        if (assignedTo && assignedTo !== userId) {
            // const todoList = await TodoList.findById(listId);
            const assignedUser = await User.findById(assignedTo);
            const creator = await User.findById(userId);

            await notifyTaskAssigned(assignedUser, title, todoList.name, creator.username);
        }

        // If it's a subtask, update parent task
        if (parentTask) {
            await Task.findByIdAndUpdate(parentTask, {
                $push: {
                    subTask: task._id
                }
            });
        }

        return await Task.findById(task._id)
        .populate('assignedTo', 'username profilePicture')
        .populate('createdBy', 'username profilePicture')
        .populate('list', 'name')
        .lean();
    } catch (error) {
        console.error("Error creating task: ", error);
        throw error;
    }
};

export const getTaskByTodoList = async (userId, todoListId, options = {}) => {
    try {
        const todoList = await TodoList.findById(todoListId);
        if (!todoList) {
            throw new AppError("Todo List not found", 404);
        }

        const {
            page = 1,
            limit = 10,
            includeCompleted = true,
            status = null,
            priority = null,
            assignedTo = null,
            sortBy = 'createdAt',
            sortOrder = -1,
            search = null
        } = options;

        // Check if user has access to the todo list
        const isOwner = todoList.owner.toString() === userId.toString();
        const isCollaborator = todoList.collaborators.some((collab) => collab.toString() === userId.toString());
        if (!isOwner && !isCollaborator) {
            throw new AppError("You don't have access to this todo list", 403);
        }

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const query = {
            list: todoListId,
            parentTask: null
        };

        if (!includeCompleted) query.completed = false;
        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (assignedTo) query.assignedTo = assignedTo;
        if (search) {
            query.$or = [
                {
                    title: {
                        $regex: search,
                        $options: 'i'
                    }
                },
                {
                    description: {
                        $regex: search,
                        $options: 'i'
                    }
                }
            ]
        }

        const tasks = await Task.find(query)
        .sort({[sortBy]: sortOrder})
        .skip(skip)
        .limit(limitNum)
        .populate('assignedTo', 'username profilePicture')
        .populate('createdBy', 'username profilePicture')
        .populate('completedBy', 'username profilePicture')
        .populate('comments.author', 'username profilePicture')
        .exec();

        const total = await Task.countDocuments(query);

        return {
            tasks,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        };
    } catch (error) {
        console.error("Error fetching tasks: ", error);
        throw error;
    }
};

export const getTaskById = async (userId, todoListId, taskId) => {
    try {
        const todoList = await TodoList.findById(todoListId);
        if (!todoList) {
            throw new AppError("Todo List not found", 404);
        }

        // Check if user has access to the todo list
        const isOwner = todoList.owner.toString() === userId.toString();
        const isCollaborator = todoList.collaborators.some((collab) => collab.toString() === userId.toString());
        if (!isOwner && !isCollaborator) {
            throw new AppError("You don't have access to this todo list", 403);
        }

        // Check if the task is belong to the todoList
        const isBelong = todoList.tasks.some((task) => task.toString() === taskId.toString());
        if (!isBelong) {
            throw new AppError("this task is not belong to this todo list", 403);
        }

        const task = await Task.findById(taskId)
        .populate('assignedTo', 'username profilePicture email')
        .populate('createdBy', 'username profilePicture')
        .populate('completedBy', 'username profilePicture')
        .populate('assignedBy', 'username profilePicture')
        .populate('list', 'name')
        .populate('parentTask', 'title')
        .populate('comments.author', 'username profilePicture')
        .populate('activityLog.user', 'username profilePicture')
        .exec();
        if (!task) {
            throw new AppError("Task not found", 404);
        }

        return task;
    } catch (error) {
        console.error("Error fetching task by ID: ", error);
        throw error;
    }
};

export const updateTask = async (userId, todoListId, taskId, updateData) => {
    try {
        const todoList = await TodoList.findById(todoListId);
        if (!todoList) {
            throw new AppError("Todo List not found", 404);
        }

        // Check if user has access to the todo list
        const isOwner = todoList.owner.toString() === userId.toString();
        const isCollaborator = todoList.collaborators.some((collab) => collab.toString() === userId.toString());
        if (!isOwner && !isCollaborator) {
            throw new AppError("You don't have access to this todo list", 403);
        }

        const task = await Task.findById(taskId);
        if (!task) {
            throw new AppError("Task not found", 404);
        }

        // Check if the task is belong to the todoList
        if (task.list.toString() !== todoListId.toString()) {
            throw new AppError("This task is not belong to this todo list", 403);
        }

        // Check if user is creator of the task or owner of the todo list
        const isCreator = task.createdBy.toString() === userId.toString();
        if (!isOwner && !isCreator) {
            throw new AppError("You can only update tasks you created or if you're the todo list owner", 403);
        }

        const {
            title,
            description,
            dueDate,
            priority,
            status,
            assignedTo,
            tags
        } = updateData;

        const assignedBy = await User.findById(userId);
        if (!assignedBy) {
            throw new AppError("User not found", 404);
        }

        // Store oldValues for activity log
        const oldValues = {
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            priority: task.priority,
            status: task.status,
            assignedTo: task.assignedTo,
        };

        if (title !== undefined) task.title = title;
        if (description !== undefined) task.description = description;
        if (dueDate !== undefined) task.dueDate = dueDate;
        if (priority !== undefined) task.priority = priority;
        if (status !== undefined) task.status = status;
        if (tags !== undefined) task.tags = tags;

        // Handle assignedTo change
        if (assignedTo !== undefined) {
            // Check if new user is different from old
            if (assignedTo && assignedTo !== task.assignedTo?.toString()) {
                // Validate new assignee
                const assignee = await User.findById(assignedTo);
                if (!assignee) {
                    throw new AppError("Assignee user not found or not join this todo list", 404);
                }

                task.assignedTo = assignedTo;
                task.assignedBy = userId;
                task.assignedAt = new Date();
    
                // Notify new Assignee
                const assigner = await User.findById(userId);
    
                await notifyTaskAssigned(assignedTo, task.title, todoList.name, assigner.username);
            } else if (!assignedTo) {
                // Unassign task
                task.assignedTo = null;
                task.assignedBy = null;
                task.assignedAt = null;
            }
        }

        // Add activity log
        const changes = {};
        Object.keys(oldValues).forEach(key => {
            if (updateData[key] !== undefined && oldValues[key] !== updateData[key]) {
                changes[key] = {
                    from: oldValues[key],
                    to: updateData[key]
                }
            }
        });

        if (Object.keys(changes).length > 0) {
            task.activityLog.push({
                action: "UPDATED",
                user: userId,
                details: {
                    changes
                }
            });
        }

        await task.save();

        // Notify task updated
        await notifyTaskUpdated(userId, task.title, todoList.name, assignedBy.username);

        return task;
    } catch (error) {
        console.error("Error updating task: ", error);
        throw error;
    }
};

export const completeTask = async (userId, todoListId, taskId) => {
    try {
        const todoList = await TodoList.findById(todoListId);
        if (!todoList) {
            throw new AppError("Todo List not found", 404);
        }

        // Check if user has access to the todo list
        const isOwner = todoList.owner.toString() === userId.toString();
        const isCollaborator = todoList.collaborators.some((collab) => collab.toString() === userId.toString());
        if (!isOwner && !isCollaborator) {
            throw new AppError("You don't have access to this todo list", 403);
        }

        const task = await Task.findById(taskId);
        if (!task) {
            throw new AppError("Task not found", 404);
        }
        
        // Check if the task is belong to the todoList
        if (task.list.toString() !== todoListId.toString()) {
            throw new AppError("This task is not belong to this todo list", 403);
        }

        if (task.assignedTo && task.assignedTo.toString() !== userId.toString()) {
            throw new AppError("You can only complete tasks assigned to you", 403);
        }

        if (task.completed) {
            // Mark as incomplete
            task.completed = false;
            task.completedBy = null;
            task.completedAt = null;
            task.status = TASK_STATUS.TODO;

            task.activityLog.push({
                action: "UPDATED",
                user: userId,
                details: {
                    changes: {
                        completed: {
                            from: true,
                            to: false
                        }
                    }
                }
            });
        } else {
            // Mark as complete
            await task.markAsCompleted(userId);

            // Notify asiggnee if different from completer
            if (task.assignedTo && task.assignedTo.toString() !== userId.toString()) {
                const completer = await User.findById(userId);
                
                await notifyTaskCompleted(userId, task.title, todoList.name, completer.username);
            }
        }
        
        await task.save();

        return task;
    } catch (error) {
        console.error("Error completing task: ", error);
        throw error;
    }
};

export const deleteTask = async (userId, todoListId, taskId) => {
    try {
        const todoList = await TodoList.findById(todoListId);
        if (!todoList) {
            throw new AppError("Todo List not found", 404);
        }

        // Check if user has access to the todo list
        const isOwner = todoList.owner.toString() === userId.toString();
        const isCollaborator = todoList.collaborators.some((collab) => collab.toString() === userId.toString());
        if (!isOwner && !isCollaborator) {
            throw new AppError("You don't have access to this todo list", 403);
        }

        const task = await Task.findById(taskId);
        if (!task) {
            throw new AppError("Task not found", 404);
        }

        // Check if the task is belong to the todoList
        if (task.list.toString() !== todoListId.toString()) {
            throw new AppError("Task is not belong to this todo list", 403);
        }

        const isCreator = task.createdBy.toString() === userId.toString();
        // Check if user is creator of the task or owner of the todo list
        if (!isOwner && !isCreator) {
            throw new AppError("You can only delete tasks you created or if you're the todo list owner", 403)
        }

        // Soft delete
        await task.softDelete(userId);

        // If the task has subtasks, soft delete them too
        if (task.subTask && task.subTask.length > 0) {
            await Task.updateMany(
                {
                    _id: {
                        $in: task.subTask
                    }
                },
                {
                    isDeleted: true,
                    deletedAt: new Date(),
                    deletedBy: userId
                }
            );
        }

        // Remove from parent task if it's a subtask
        if (task.parentTask) {
            await Task.findByIdAndUpdate(task.parentTask, {
                $pull: {
                    subTask: taskId
                }
            });
        }

        // Notify assigned user if different from deleter
        const deleter = await User.findById(userId);

        await notifyTaskDeleted(task.assignedTo, task.title, todoList.name, deleter.username);
    } catch (error) {
        console.error("Error deleting task: ", error);
        throw error;
    }
};

export const addTaskComment = async (userId, todoListId, taskId, commentText) => {
    try {
        const task = await Task.findById(taskId);
        if (!task) {
            throw new AppError("Task not found", 404);
        }
        
        const todoList = await TodoList.findById(todoListId);
        if (!todoList) {
            throw new AppError("Todo List not found", 404);
        }


        // Check if task is belong to the todo list
        if (task.list.toString() !== todoListId.toString()) {
            throw new AppError("Task is not belong to this todo list", 403);
        }

        // Check if user has access to the todo list
        const isOwner = todoList.owner.toString() === userId.toString();
        const isCollaborator = todoList.collaborators.some((collab) => collab.toString() === userId.toString());
        if (!isOwner && !isCollaborator) {
            throw new AppError("You don't have access to this todo list", 403);
        }

        await task.addComment(commentText, userId);

        // notify other participants
        const participants = todoList.collaborators.filter((collab) => collab.toString() !== userId.toString());

        // Unique the participants to avoid duplicate notifications
        const uniqueParticipants = [...new Set(participants.map((participant) => participant.toString()))];

        if (uniqueParticipants.length > 0) {
            const commenter = await User.findById(userId);
            
            const notifications = uniqueParticipants.map((participantId) => ({
                user: participantId,
                type: "TASK_COMMENTED",
                title: "New Comment on Task",
                message: `${commenter.username} commented on "${task.title}" in "${todoList.name}" todo list`,
                data: {
                    taskId: task._id,
                    todoListId: task.list,
                    commentedBy: userId,
                    comment: commentText
                }
            }));

            await createBulkNotifications(notifications);
        }

        return task;
    } catch (error) {
        console.error("Error adding task comment: ", error);
        throw error;
    }
};

export const getMyTasks = async (userId, options = {}) => {
    try {
        const {
            page = 1,
            limit = 10,
            includeCompleted = false,
            status = null,
            priority = null,
            sortBy = 'dueDate',
            sortOrder = 1,
        } = options;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const query = {assignedTo: userId};

        if (!includeCompleted) query.completed = false;
        if (status) query.status = status;
        if (priority) query.priority = priority;
        
        const tasks = await Task.find(query)
        .sort({[sortBy]: sortOrder})
        .skip(skip)
        .limit(limitNum)
        .populate('createdBy', 'username profilePicture')
        .populate('list', 'name')
        .populate('completedBy', 'username profilePicture')
        .exec();

        const total = await Task.countDocuments(query);

        return {
            tasks,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        };
    } catch (error) {
        console.error("Error getting my tasks: ", error);
        throw error;
    }
};

export const getOverdueTasks = async (userId) => {
    try {
        const tasks = await Task.getOverdueTask(userId);
        return tasks;
    } catch (error) {
        console.error("Error getting overdue tasks: ", error);
        throw error;
    }
};

export const getTaskStats = async (userId, todoListId = null) => {
    try {
        const query = todoListId ? {list: todoListId} : {};

        if (!todoListId) {
            const userList = await TodoList.find({
                $or: [
                    {owner: userId},
                    {collaborators: userId}
                ]
            }).select('_id');

            query,list = {
                $in: userList.map((list) => list._id)
            };
        } else {
            // Check if user has access to the todo list
            const todoList = await TodoList.findById(todoListId);

            const isOwner = todoList.owner.toString() === userId.toString();
            const isCollaborator = todoList.collaborators.some((collab) => collab.toString() === userId.toString());
            if (!isOwner && !isCollaborator) {
                throw new AppError("You don't have access to this todo list", 403);
            }
        }

        const stats = await Task.aggregate([
            {
                $match: query
            },
            {
                $group: {
                    _id: null,
                    total: {
                        $sum: 1
                    },
                    completed: {
                        $sum: {
                            $cond: [
                                '$completed',
                                1,
                                0
                            ]
                        }
                    },
                    overdue: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $lt: ['$dueDate', new Date()] },
                                        { $eq: ['$completed', false] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    byStatus: {
                        $push: '$status'
                    },
                    byPriority: {
                        $push: '$priority'
                    }
                }
            }
        ]);

        if (stats.length === 0) {
            return {
                total: 0,
                completed: 0,
                overdue: 0,
                byStatus: [],
                byPriority: []
            };
        }

        const result = stats[0];

        // Count by status
        const statusCount = {};
        result.byStatus.forEach((status) => {
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        // Count by priority
        const priorityCounts = {};
        result.byPriority.forEach(priority => {
            priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
        });

        return {
            total: result.total,
            completed: result.completed,
            overdue: result.overdue,
            pending: result.total - result.completed,
            byStatus: statusCounts,
            byPriority: priorityCounts
        };
    } catch (error) {
        console.error("Error fetching task stats: ", error);
        throw error;
    }
};