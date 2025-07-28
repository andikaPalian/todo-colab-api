import {z} from 'zod';
import mongoose from 'mongoose';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const newTaskSchema = z.object({
    title: z.string({
        required_error: "Title is required",
        invalid_type_error: "Title must be a string"
    }).min(1, {
        message: "Title must be at least 1 character"
    }).max(200, {
        message: "Title must be less than 200 characters"
    }),
    description: z.string({
        invalid_type_error: "Description must be a string"
    }).max(1000, {
        message: "Description must be less than 1000 characters"
    }).trim().optional(),
    dueDate: z.preprocess((date) => {
        if (typeof date === 'string' || date instanceof Date) {
            const parsedDate = new Date(date);
            return isNaN(parsedDate.getTime()) ? null : parsedDate;
        }

        return null;
    }, z.date().optional().nullable()),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
    status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).default("TODO"),
    tags: z.array(z.string().max(40, {
        message: "Tag must be less than 50 characters"
    })).optional(),
    assignedTo: z.string().optional().refine((value) => isValidObjectId(value), {
        message: "Invalid ObjectId"
    }),
    parentTask: z.string().optional().refine((value) => isValidObjectId(value), {
        message: "Invalid ObjectId"
    }).nullable()
});

export const updateTaskSchema = newTaskSchema.partial();

export const taskCommentSchema = z.object({
    commentText: z.string({
        invalid_type_error: "Comment must be a string"
    }).min(1, {
        message: "Comment must be at least 1 character"
    }).max(500, {
        message: "Comment must be less than 500 characters"
    })
});

export const taskQuerySchema = z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(10),
    includeCompleted: z.coerce.boolean().optional().default(true),
    status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    assignedTo: z.string().optional().refine((value) => !value ||  isValidObjectId(value), {
        message: "Invalid ObjectId"
    }),
    sortBy: z.string().optional().default('createdAt'),
    sortOrder: z.coerce.number().optional().default(-1),
    search: z.string().optional()
});

export const myTaskQuerySchema = z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(10),
    includeCompleted: z.coerce.boolean().optional().default(false),
    status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    sortBy: z.string().optional().default('dueDate'),
    sortOrder: z.coerce.number().optional().default(1)
})