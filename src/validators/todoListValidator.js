import {z} from 'zod';

export const todoListSchema = z.object({
    name: z.string({
        required_error: "Name is required",
        invalid_type_error: "Name must be a string"
    }).min(1, {
        message: "Name must be at least 1 character"
    }).max(50, {
        message: "Name must be less than 50 characters"
    })
});