import express from "express";
import { auth } from "../middlewares/authMiddleware.js";
import { validateBody } from "../middlewares/zodValidation.js";
import { newTaskSchema, taskCommentSchema, updateTaskSchema } from "../validators/taskValidator.js";
import { addTaskCommentController, completeTaskController, createTaskController, deleteTaskController, getMyTaskController, getOverdueTaskController, getTaskByIdController, getTaskByTodoListController, getTaskStatsController, updateTaskController } from "../controllers/task.controller.js";

export const taskRouter = express.Router();

taskRouter.post('/:todoListId/create-task', auth, validateBody(newTaskSchema), createTaskController);
taskRouter.get('/:todoListId', auth, getTaskByTodoListController);
taskRouter.get('/:todoListId/:taskId', auth, getTaskByIdController);
taskRouter.patch('/todoListId/:taskId/update', auth, validateBody(updateTaskSchema), updateTaskController);
taskRouter.patch('/:todoListId/:taskId/complete', auth, completeTaskController);
taskRouter.delete('/:todoListId/:taskId', auth, deleteTaskController);
taskRouter.post('/:todoListId/:taskId/comment', auth, validateBody(taskCommentSchema), addTaskCommentController);
taskRouter.get('/my-task', auth, getMyTaskController);
taskRouter.get('/task/overdue', auth, getOverdueTaskController);
taskRouter.get('/task/stats', auth, getTaskStatsController);