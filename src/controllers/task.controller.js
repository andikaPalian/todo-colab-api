import { createTask, getTaskByTodoList, getTaskById, updateTask, deleteTask, completeTask, addTaskComment, getMyTasks, getOverdueTasks, getTaskStats } from "../services/task.service.js";
import { myTaskQuerySchema, taskQuerySchema } from "../validators/taskValidator.js";

export const createTaskController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {todoListId} = req.params;
        
        const newTask = await createTask(userId, todoListId, req.body);

        return res.status(201).json({
            success: true,
            message: "Task created successfully",
            data: {
                task: newTask
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getTaskByTodoListController = async (req, res, next) => {
    try {
        const userId = req.use.userId;
        const {todoListId} = req.params;
        const query = taskQuerySchema.safeParse(req.query);
        if (!query.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid query parameters",
                errors: query.error.flatten()
            })
        }

        const options = query.data;

        const result = await getTaskByTodoList(userId, todoListId, options);

        return res.status(200).json({
            success: true,
            message: "Tasks fetched successfully",
            data: {
                tasks: result
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getTaskByIdController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {todoListId, taskId} = req.params;

        const task = await getTaskById(userId,
            todoListId, taskId
        );

        return res,status(200).json({
            success: true,
            message: "Task fetched successfully",
            data: {
                task: task
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateTaskController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {todoListId, taskId} = req.params;

        const task = await updateTask(userId, todoListId, taskId, req.body);

        return res.status(200).json({
            success: true,
            message: "Task updated successfully",
            data: {
                task: task
            }
        });
    } catch (error) {
        next(error);
    }
};

export const completeTaskController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {todoListId, taskId} = req.params;

        const task = await completeTask(userId, todoListId, taskId);

        const message = task.completed ? "Task completed successfully" : "Task uncompleted successfully";

        return res.status(200).json({
            success: true,
            message: message,
            data: {
                task: task
            }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteTaskController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {todoListId, taskId} = req.params;

        await deleteTask(userId, todoListId, taskId);

        return res.status(200).json({
            success: true,
            message: "Task deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const addTaskCommentController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {todoListId, taskId} = req.params;
        const {commentText} = req.body;

        const task = await addTaskComment(userId, todoListId, taskId, commentText);

        return res.status(200).json({
            success: true,
            message: "Comment added successfully",
            data: {
                task: task
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getMyTaskController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const query = myTaskQuerySchema.safeParse(req.query);
        if (!query.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid query parameters",
                errors: query.error.flatten()
            })
        }
        
        const options = query.data;

        const result = await getMyTasks(userId, options);

        return res.status(200).json({
            success: true,
            message: "Task fetched successfully",
            data: {
                myTask: result
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getOverdueTaskController = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const task = await getOverdueTasks(userId);

        return res.status(200).json({
            success: true,
            message: "Overdue tasks ferched successfully",
            data: {
                overdueTask: task
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getTaskStatsController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {todoListId} = req.query;

        const stats = await getTaskStats(userId, todoListId);

        return res.status(200).json({
            success: true,
            message: "Task stats fetched successfully",
            data: {
                taskStats: stats
            }
        });
    } catch (error) {
        next(error);
    }
};