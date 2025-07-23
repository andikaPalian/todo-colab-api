import express from 'express';
import { changePasswordController, editProfileController, getUserProfileController } from '../controllers/user.controller.js';
import { auth } from '../middlewares/authMiddleware.js';
import { validateBody } from '../middlewares/zodValidation.js';
import { passwordChangeSchema, profileUpdateSchema } from '../validators/userValidator.js';
import upload from '../middlewares/multer.js';

export const userRouter = express.Router();

userRouter.get('/profile', auth, getUserProfileController);
userRouter.patch('/:userId/edit', auth, upload.single('profilePicture'),validateBody(profileUpdateSchema), editProfileController);
userRouter.put('/:userId/change-password', auth, validateBody(passwordChangeSchema), changePasswordController);