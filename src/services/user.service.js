import User from "../models/user.model.js";
import { AppError } from "../utils/errorHandler.js";
import {v2 as cloudinary} from "cloudinary";
import fs from 'fs/promises';
import bcrypt from 'bcrypt';

export const editProfile = async (userId,{username}, file) => {
    try {
        const user = await User.findById(userId);

        if (file) {
            if (user.cloudinaryId) {
                await cloudinary.uploader.destroy(user.cloudinaryId);
            }

            const result = await cloudinary.uploader.upload(file.path, {
                folder: 'profile_pictures',
                unique_filename: true,
                use_filename: true
            });

            await fs.unlink(file.path);

            data.profilePicture = result.secure_url;
            data.cloudinaryId = result.public_id;
        }

        const newData = {
            username: username || user.username,
            profilePicture: user.profilePicture,
            cloudinaryId: user.cloudinaryId
        };

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            newData,
            {
                new: true
            }
        );
        if (!updatedUser) {
            throw new AppError("User not found", 404);
        }

        return updatedUser;
    } catch (error) {
        console.error("Error editing profile: ", error);
        throw error;
    }
};

export const changePassword = async (userId, {currentPassword, newPassword}) => {
    try {
        const user = await User.findById(userId).exec();

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            throw new AppError("Incorrect current password", 401);
        }

        const isSame = await bcrypt.compare(newPassword, user.password);
        if (isSame) {
            throw new AppError("New password cannot be the same as the current password", 400);
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        user.password = hashedPassword;
        await user.save();

        return user;
    } catch (error) {
        console.error("Error changing password: ", error);
        throw error;
    }
};

export const getUserProfile = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }

        return user;
    } catch (error) {
        console.error("Error fetching user profile: ", error);
        throw error;
    }
};