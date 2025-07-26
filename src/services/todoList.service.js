import TodoList from "../models/toDoList.model.js";
import User from "../models/user.model.js";
import { notifyCollaboratorKicked, notifyCollaboratorLeft, notifyCollaboratorsAdded, notifyTodoListDeleted } from "./notification.service.js";
import { AppError } from "../utils/errorHandler.js";

export const createTodoList = async (userId, {name}) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const newTodoList = await TodoList.create({
            name,
            owner: userId
        });

        return newTodoList;
    } catch (error) {
        console.error("Error creating todo list: ", error);
        throw error;
    }
};

export const getTodoLists = async (userId, {page = 1, limit = 10}) => {
    try {
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const user = await User.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }

        // Filter todo lists by owner or collaborator
        const todoLists = await TodoList.find({
            $or: [
                {owner: userId},
                {collaborators: userId}
            ]
        })
        .skip(skip)
        .limit(limitNum)
        .populate('owner', 'username profilePicture')
        .populate('collaborators', 'username profilePicture')
        .exec();

        // Check if user is owner or collaborator
        // const isOwner = todoLists.some(todo => todo.owner.toString() === userId.toString());
        // const isCollaborator = todoLists.some(todo => todo.collaborators.toString() === userId.toString());
        // if (!isOwner && !isCollaborator) {
        //     throw new AppError("You dont have access to any todo lists", 403);
        // }
        
        const total = await TodoList.countDocuments({
            $or: [
                {owner: userId},
                {collaborators: userId}
            ]
        });

        const result = todoLists.map(todo => {
            const isOwner = todo.owner._id.toString() === userId.toString();
            // const isCollaborator = todo.collaborators.some(collab => collab.toString() === userId.toString());
            const role = isOwner ? 'owner' : 'collaborator';
            return {
                ...todo.toObject(),
                role
            }
        });

        if (!todoLists || todoLists.length === 0) {
            return [];
        }

        return {
            todoLists: result,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: total,
                pages: Math.ceil(total / limitNum)
            }
        };
    } catch (error) {
        console.error("Error fetching todo lists: ", error);
        throw error;
    }
};

export const getTodoListById = async (userId, todoListId) => {
    try {
        const user= await User.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const todoList = await TodoList.findById(todoListId)
        .populate('owner', 'username profilePicture')
        .populate('collaborators', 'username profilePicture');
        if (!todoList) {
            throw new AppError("Todo list not found", 404);
        }

        // Check if user is owner or collaborator
        const isOwner = todoList.owner.toString() === userId.toString();
        const isCollaborator = todoList.collaborators.some((collaborator) => collaborator.toString() === userId.toString());
        if (!isOwner && !isCollaborator) {
            throw new AppError("You are not authorized to access this todo list", 403);
        }

        return todoList;
    } catch (error) {
        console.error("Error fetching todo list by ID: ", error);
        throw error;
    }
};

export const updateTodoList = async (userId, todoListId, {name}) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const todoList = await TodoList.findById(todoListId);
        if (!todoList) {
            throw new AppError("Todo list not found", 404);
        }

        if (todoList.owner.toString() !== userId.toString()) {
            throw new AppError("You are not authorized to update this todo list", 403);
        }

        // todoList.name = name || todoList.name;

        const updatedTodsoList = await TodoList.findByIdAndUpdate(
            todoListId,
            {
                name: name || todoList.name   
            },
            {
                new: true
            }
        )
        .populate('owner', 'username profilePicture')
        .populate('collaborators', 'username profilePicture');

        return updatedTodsoList;
    } catch (error) {
        console.error("Error updating todo list: ", error);
        throw error;
    }
};

export const deleteTodoList = async (userId, todoListId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const todoList = await TodoList.findById(todoListId)
        .populate('owner', 'username')
        .populate('collaborators', '_id');
        if (!todoList) {
            throw new AppError("Todo list not found", 404);
        }

        if (todoList.owner.toString() !== userId.toString()) {
            throw new AppError("You are not authorized to delete this todo list", 403);
        }

        // Notify all collaborators before deleting
        if (todoList.collaborators.length > 0) {
            const collaboratorIds = todoList.collaborators.map((collaborator) => collaborator._id);
            await notifyTodoListDeleted(collaboratorIds, todoList.name, todoList.owner.username);
        }

        const deletedTodoList = await TodoList.findByIdAndDelete(todoListId);
        if (!deletedTodoList) {
            throw new AppError("Todo list not found or alreadty deleted", 404);
        }

        return deletedTodoList;
    } catch (error) {
        console.error("Error deleting todo list: ", error);
    }
};

export const addColaborator = async (userId, todoListId, collaboratorId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const collaborator = await User.findById(collaboratorId);
        if (!collaborator) {
            throw new AppError("Collaborator not found", 404);
        }

        const todoList = await TodoList.findById(todoListId);
        if (!todoList) {
            throw new AppError("Todo list not found", 404);
        }

        if (todoList.owner.toString() !== userId.toString()) {
            throw new AppError("You are not authorized to add collaborators to this todo list", 403);
        }

        // Check if user is trying to add themselves
        if (userId.toString() === collaboratorId.toString()) {
            throw new AppError("You cannot add yourself as a collaborator", 400);
        }

        const isCollaborator = todoList.collaborators.find(collab => collab.toString() === collaboratorId.toString());
        if (isCollaborator) {
            throw new AppError("Collaborator already added", 400);
        }

        todoList.collaborators.push(collaboratorId);
        await todoList.save();

        // Notify the new collaborator
        await notifyCollaboratorsAdded(
            collaboratorId,
            todoListId,
            todoList.name,
            user.username
        );

        return todoList.populate('collaborators', 'username profilePicture');
    } catch (error) {
        console.error("Error adding collaborator: ", error);
        throw error;
    }
};

export const leftTodoList = async (todoListId, collaboratorId) => {
    try {
        const collaborator = await User.findById(collaboratorId);
        if (!collaborator) {
            throw new AppError("Collaborator not found", 404);
        }

        const todoList = await TodoList.findById(todoListId);
        if (!todoList) {
            throw new AppError("Todo list not found", 404);
        }

        const isCollaborator = todoList.collaborators.find(collab => collab.toString() === collaboratorId.toString());
        if (!isCollaborator) {
            throw new AppError("Collaborator not found in todo list", 404);
        }

        todoList.collaborators = todoList.collaborators.filter(collab => collab.toString() !== collaboratorId.toString());
        await todoList.save();

        // Notify the owner
        await notifyCollaboratorLeft(
            todoList.owner._id,
            collaborator.username,
            todoList.name
        );

        return todoList;
    } catch (error) {
        console.error("Error leaving todo list: ", error);
        throw error;
    }
};

export const kickCollaborator = async (userId, todoListId, collaboratorId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const todoList = await TodoList.findById(todoListId);
        if (!todoList) {
            throw new AppError("Todo list not found", 404);
        }

        const collaborator = await User.findById(collaboratorId);
        if (!collaborator) {
            throw new AppError("Collaborator not found", 404);
        }

        if (todoList.owner.toString() !== userId.toString()) {
            throw new AppError("You are not authorized to kick collaborators from this todo list", 403);
        }

        const isCollaborator = todoList.collaborators.find(collab => collab.toString() === collaboratorId.toString());
        if (!isCollaborator) {
            throw new AppError("Collaborator not found in todo list", 404);
        }

        todoList.collaborators = todoList.collaborators.filter(collab => collab.toString() !== collaboratorId.toString());
        await todoList.save();

        // Notify the kicked collaborator
        await notifyCollaboratorKicked(
            collaboratorId,
            todoList.name,
            user.username
        );

        return todoList.populate('collaborators', 'username profilePicture');
    } catch (error) {
        console.error("Error kicking collaborator: ", error);
        throw error;
    }
};

export const joinTodoList = async (todoListId, collaboratorId) => {
    try {
        const collaborator = await User.findById(collaboratorId);
        if (!collaborator) {
            throw new AppError("Collaborator not found", 404);
        }

        const todoList = await TodoList.findById(todoListId);
        if (!todoList) {
            throw new AppError("Todo list not found", 404);
        }

        // Check if user is owner
        if (todoList.owner.toString() === userId.toString()) {
            throw new AppError("You are the owner of this todo list", 400);
        }

        const isCollaborator = todoList.collaborators.find(collab => collab.toString() === collaboratorId.toString());
        if (isCollaborator) {
            throw new AppError("You are already a collaborator", 400);
        }

        todoList.collaborators.push(collaboratorId);
        await todoList.save();

        return todoList.populate('collaborators', 'username profilePicture');
    } catch (error) {
        console.error("Error joining todo list: ", error);
        throw error;
    }
};

export const listCollaborators = async (userId, todoListId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const todoList = await TodoList.findById(todoListId);
        if (!todoList) {
            throw new AppError("Todo list not found", 404);
        }

        // Check if user has access to this todo list
        const isOwner = todoList.owner.toString() === userId.toString();
        const isCollaborator = todoList.collaborators.some((collaborator) => collaborator.toString() === userId.toString());
        if (!isOwner && !isCollaborator) {
            throw new AppError("You are not authorized to access this todo list", 403);
        }

        const collaborators = await User.find({
            _id: {$in: todoList.collaborators},
            _id: {$ne: userId}
        }).select("username profilePicture email");

        // const totalCollaborator = await User.countDocuments({_id: {$in: todoList.collaborators}});

        return collaborators;
    } catch (error) {
        console.error("Error listing collaborators: ", error);
        throw error;
    }
};