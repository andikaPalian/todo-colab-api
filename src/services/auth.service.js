import User from "../models/user.model.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { AppError } from "../utils/errorHandler.js";

export const register = async ({username, email, password}) => {
    try {
        const existingUser = await User.findOne({
            email: email
        });
        if (existingUser) {
            throw new AppError("User already exists. Please login", 400);
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = await User.create({
            username,
            email,
            password: hashedPassword
        });

        return {
            username: newUser.username,
            smail: newUser.email
        };
    } catch (error) {
        console.error("Error registering user: ", error);
        throw error;
    }
};

export const login = async ({email, password}) => {
    try {
        const user = await User.findOne({
            email: email
        });
        if (!user) {
            throw new AppError("User not found. Please register", 404);
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new AppError("Invalid credentials", 401);
        }

        const token = jwt.sign({
            id: user._id,
            email: user.email
        }, process.env.JWT_SECRET, {
            expiresIn: "1d"
        });

        return token;
    } catch (error) {
        console.error('Error logging in user: ', error);
        throw error;
    }
};