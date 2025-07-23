import { register, login } from "../services/auth.service.js";

export const registerUser = async (req, res, next) => {
    try {
        const newUser = await register(req.body);

        return res.status(201).json({
            succcess: true,
            message: "User registered successfully",
            newUser
        });
    } catch (error) {
        next(error);
    }
};

export const loginUser = async (req, res, next) => {
    try {
        const token = await login(req.body);

        return res.status(200).json({
            succcess: true,
            message: "User logged in successfully",
            token
        });
    } catch (error) {
        next(error);
    }
};