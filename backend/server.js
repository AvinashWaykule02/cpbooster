import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import connectDB from "./config/db.js";

// Routes
import authRoutes from "./routes/auth-route.js";
import leaderboardRoutes from "./routes/leaderboard.route.js";


// Cron
import { startProfileSyncCron } from "./crone/user-profile-sync.js";
import { startLeaderboardCron } from "./crone/leaderboard-sync.js";

// Workers (Importing starts the worker)
import "./workers/profile-worker.js"; 
import "./workers/friend-worker.js";
import "./workers/leaderboard-worker.js";

dotenv.config();

const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
}));
app.use(morgan("dev"));

// Database Connection
connectDB();

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

// Basic Route
app.get("/", (req, res) => {
    res.send("Codeforces Analytics API is running...");
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    
    // Start Cron Jobs
    startProfileSyncCron();
    startLeaderboardCron();
    console.log("⏰ Cron jobs scheduled...");
});

export default app;