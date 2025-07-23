import express from 'express';
import { auth } from '../middlewares/authMiddleware.js';
import { addColaboratorController, createTodoListController, deleteTodoListController, getTodoListByIdController, getTodoListController, joinTodoListController, kickCollaboratorController, leftTodoListController, listCollaboratorsController, updateTodoListController } from '../controllers/todoList.controller.js';
import { validateBody } from '../middlewares/zodValidation.js';
import { todoListSchema } from '../validators/todoListValidator.js';

export const todoListRouter = express.Router();

// Todo list
todoListRouter.get('/', auth, getTodoListController);
todoListRouter.post('/create', auth, validateBody(todoListSchema), createTodoListController);
todoListRouter.get('/:todoListId', auth, getTodoListByIdController);
todoListRouter.put('/:todoListId', auth, validateBody(todoListSchema), updateTodoListController);
todoListRouter.delete('/:todoListId', auth, deleteTodoListController);

// Collaborator
todoListRouter.post('/:todoListId/add', auth, addColaboratorController);
todoListRouter.delete('/:todoListId/left', auth, leftTodoListController);
todoListRouter.delete('/:todoListId/kick', auth, kickCollaboratorController);
todoListRouter.post('/:todoListId/join', auth, joinTodoListController);
todoListRouter.get('/:todoListId/collaborators', auth, listCollaboratorsController);