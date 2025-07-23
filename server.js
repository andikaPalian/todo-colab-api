import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import 'dotenv/config';
import morgan from 'morgan';
import multer from 'multer';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import {createServer} from 'http';
import { connectDB } from './src/config/db.js';
import { authRouter } from './src/routes/auth.routes.js';
import connectCloudinary from './src/config/cloudinary.js';
import { userRouter } from './src/routes/user.routes.js';
import { todoListRouter } from './src/routes/todoList.routes.js';
import { setupSocketIO } from './src/config/socket.js';
import { notificationRouter } from './src/routes/notification.routes.js';
import { taskRouter } from './src/routes/task.routes.js';

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3000;

// Initialize Socket.Io
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    },
    // Connection settings
    pingTimeout: 60000,
    pingInterval: 25000,
    // Namespace settings
    transports: ['websocket', 'polling'],
    // Enable compression
    compression: true,
    httpCompression: true,
    // httpCompression: true,
    // Max HTTP buffer size
    maxHttpBufferSize: 1e6,
    // Allow binary data
    allowEIO3: true
});

// Make io available globally
app.set("io", io);

// Initialize database and cloudinary
connectDB();
connectCloudinary();

app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

app.use(express.urlencoded({
    extended: true,
    limit: '10mb'
}));

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"],
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow request with no origin (mobile, apps, etc.)
        if (!origin) {
            return callback(null, true);
        }

        const allowedOrigins = [
            process.env.CLIENT_URL || 'http://localhost:3000',
            'http://localhost:3000',
            'http://localhost:5173', // Vite dev server
            'http://localhost:5174'  // Alternative Vite port
        ];

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
}
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // // Limit each IP to 100 requests per windowMs in production
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for certain routes
    skip: (req) => {
        return req.path.startsWith('/health') || req.path.startsWith('/api/auth/refresh');
    }
});
app.use(limiter);

// Compression middleware
app.use(compression());
// app.use(morgan('dev'));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is healthy',
        timestamps: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/todoList', todoListRouter);
app.use('/api/notification', notificationRouter);
app.use('/api/task', taskRouter);

// Setup Socket.IO handlers
setupSocketIO(io);

// Handle multer errors
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: err.message });
    } else if (err) {
        console.error("Unexpected error:", err)
        return res.status(500).json({ message: err.message || "Internal server error" });
    }
    next();
});

// Gracefull shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log("SIGINT received, shutting down gracefully...");
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

// Unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error("Unhandled Promise Rejection: ", err);
    server.close(() => {
        process.exit(1);
    });
});

// Uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error("Uncaught Exceptions: ", err);
    process.exit(1);
});

// Start server
server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log("Socket.IO server ready");
});

export {io};