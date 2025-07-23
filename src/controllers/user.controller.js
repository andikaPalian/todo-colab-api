import { editProfile, changePassword, getUserProfile } from "../services/user.service.js";

export const getUserProfileController = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const user = await getUserProfile(userId);

        return res.status(200).json({
            succcess: true,
            message: "User profile fetched successfully",
            user
        });
    } catch (error) {
        next(error);
    }
};

export const editProfileController = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const updatedUser = await editProfile(userId, req.body, req.file);

        return res.status(200).json({
            succcess: true,
            message: "User profile updated successfully",
            updatedUser
        });
    } catch (error) {
        next(error);
    }
};

export const changePasswordController = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const user = await changePassword(userId, req.body);

        return res.status(200).json({
            succcess: true,
            message: "Password changed successfully",
            user
        });
    } catch (error) {
        next(error);
    }
}