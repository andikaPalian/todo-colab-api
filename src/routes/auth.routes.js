import express from 'express';
import { loginUser, registerUser } from '../controllers/auth.controller.js';
import { validateBody } from '../middlewares/zodValidation.js';
import { loginSchema, registerSchema } from '../validators/authValidator.js';

export const authRouter = express.Router();

authRouter.post('/register', validateBody(registerSchema), registerUser);
authRouter.post('/login',validateBody(loginSchema), loginUser);