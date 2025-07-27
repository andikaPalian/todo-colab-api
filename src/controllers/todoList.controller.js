import { createTodoList, getTodoLists, getTodoListById, updateTodoList, deleteTodoList, addColaborator, leftTodoList, kickCollaborator, joinTodoList, listCollaborators, approveJoinRequest, rejectJoinRequest } from "../services/todoList.service.js";

export const createTodoListController = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const newTodoList = await createTodoList(userId, req.body);

        return res.status(201).json({
            succcess: true,
            message: "Todo list created successfully",
            data: {
                todoList: newTodoList
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getTodoListController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        
        const todoLists = await getTodoLists(userId, req.query);

        // Handle empty result
        if (Array.isArray(todoLists) && todoLists.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No todo lists found",
                data: {
                    todoLists: [],
                    pagination: {
                        page: 1,
                        limit: 10,
                        total: 0,
                        pages: 0
                    }
                }
            });
        }

        return res.status(200).json({
            succcess: true,
            message: "Todo lists fetched successfully",
            data: todoLists
        });
    } catch (error) {
        next(error);
    }
};

export const getTodoListByIdController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {todoListId} = req.params;
        
        const todoList = await getTodoListById(userId, todoListId);

        return res.status(200).json({
            succcess: true,
            message: "Todo list fetched successfully",
            data: {
                todoList
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateTodoListController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {todoListId} = req.params;

        const updatedTodoList = await updateTodoList(userId, todoListId, req.body);

        return res.status(200).json({
            succcess: true,
            message: "Todo list updated successfully",
            data: {
                updatedTodoList
            }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteTodoListController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {todoListId} = req.params;

        await deleteTodoList(userId, todoListId);

        return res.status(200).json({
            succcess: true,
            message: "Todo list deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

export const addColaboratorController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {todoListId} = req.params;
        const {collaboratorId} = req.body;

        if (!collaboratorId) {
            return res.status(400).json({
                success: false,
                message: "Collaborator id is required"
            });
        }

        const updatedTodoList = await addColaborator(userId, todoListId, collaboratorId);

        return res.status(200).json({
            succcess: true,
            message: "Collaborator added successfully",
            data: {
                updatedTodoList
            }
        });
    } catch (error) {
        next(error);
    }
};

export const leftTodoListController = async (req, res, next) => {
    try {
        const collaboratorId = req.user.userId;
        const {todoListId} = req.params;

        const updatedTodoList = await leftTodoList(todoListId, collaboratorId);

        return res.status(200).json({
            success: true,
            message: "Successfully left todo list",
            data: {
                updatedTodoList
            }
        });
    } catch (error) {
        next(error);
    }
};

export const kickCollaboratorController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {todoListId} = req.params;
        const {collaboratorId} = req.body;

        if (!collaboratorId) {
            return res.status(400).json({
                success: false,
                message: "Collaborator id is required"
            });
        }

        const updatedTodoList = await kickCollaborator(userId, todoListId, collaboratorId);

        return res.status(200).json({
            success: true,
            message: "Successfully kicked collaborator",
            data: {
                updatedTodoList
            }
        });
    } catch (error) {
        next(error);
    }
};

export const joinTodoListController = async (req, res, next) => {
    try {
        const collaboratorId = req.user.userId;
        const {todoListId} = req.params;

        await joinTodoList(todoListId, collaboratorId);

        return res.status(200).json({
            success: true,
            message: "Join request sent. Waiting for owner approval.",
        });
    } catch (error) {
        next(error);
    }
};

export const approveJoinRequestController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {todoListId} = req.params;
        const {requestingUserId} = req.body;

        if (!requestingUserId) {
            return res.status(400).json({
                success: false,
                message: "Requesting user id is required"
            });
        }

        await approveJoinRequest(userId, todoListId, requestingUserId);

        return res.status(200).json({
            success: true,
            message: "Join request approved successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const rejectJoinReqyuestController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {todoListId} = req.params;
        const {requestingUserId} = req.body;

        if (!requestingUserId) {
            return res.status(400).json({
                success: false,
                message: "Requesting user id is required"
            });
        }

        await rejectJoinRequest(userId, todoListId, requestingUserId);

        return res.status(200).json({
            success: true,
            message: "Join request rejected successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const listCollaboratorsController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {todoListId} = req.params;

        const collaborators = await listCollaborators(userId, todoListId);

        return res.status(200).json({
            success: true,
            message: "Successfully listed collaborators",
            data: {
                collaborators,
                total: collaborators.length
            }
        });
    } catch (error) {
        next(error);
    }
};