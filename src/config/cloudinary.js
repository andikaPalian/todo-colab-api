import {v2 as cloudinary} from "cloudinary";

const connectCloudinary = () => {
    try {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });

        if (!process.env.CLOUDINARY_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            throw new Error("Cloudinary credentials are missing or invalid. Please check your environment variables.");
        }

        console.log("Cloudinary connected successfully");
    } catch (error) {
        console.error("Error connecting to cloudinary:", error);
        process.exit(1);
    }
}

export default  connectCloudinary;