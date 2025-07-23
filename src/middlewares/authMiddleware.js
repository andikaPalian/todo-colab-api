import mongoose from "mongoose";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

export const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;

        // Pastikan header Authorization ada dan diawali format "Bearer <token>"
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Token is missing or not provided"
            });
        }

        const token = authHeader.split(" ")[1];

        // Verifikasi token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET)
        } catch (error) {
            return res.status(401).json({
                message: error.name === "TokenExpiredError" ? "Unauthorized: Token has expired" : "Unauthorized: Invalid token"
            });
        }

        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        req.user = {
            userId: user._id,
            username: user.username,
            email: user.email
        };

        next();
    } catch (error) {
        console.error("Error during authentication: ", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message || "An unexpected error occurred"
        });
    }
};