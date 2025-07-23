import multer  from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fileFilter = (req, file, callback) => {
    const allowedTypes = ["image/png", "image/jpg", "image/jpeg", "video/mp4", "video/mkv", "video/avi", "video/webm"];
    if (allowedTypes.includes(file.mimetype)) {
        callback(null, true);
    } else {
        callback(new Error("Invalid file type. Only PNG, JPG, JPEG, MP4, MKV, AVI, and WEBM files are allowed."), false);
    }
};

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, callback) => {
        const timestamps = Date.now();
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        callback(null, `${name}-${timestamps}${ext}`);
    }
});

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 100, // 100 MB
    }
});

export default upload;