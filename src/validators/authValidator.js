import {z} from 'zod';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const registerSchema = z.object({
    username: z.string({
        required_error: "Username is required",
        invalid_type_error: "Username must be a string"
    }).min(3, {
        message: "Username must be at least 3 characters"
    }).max(50, {
        message: "Username must be less than 50 characters"
    }),
    email: z.string().email(),
    password: z.string().regex(passwordRegex, {
        message: "Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    })
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().regex(passwordRegex, {
        message: "Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    })
});