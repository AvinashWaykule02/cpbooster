import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import connectDB from "./config/db.js";

// Routes
import authRoutes from "./routes/auth-route.js";
import leaderboardRoutes from "./routes/leaderboard.route.js";
import dashboardRoutes from "./routes/dashboard-routes.js";
import contestRoutes from "./routes/contest-routes.js";
import dppRoutes from "./routes/dpp-routes.js";
import adminRoutes from "./routes/admin-routes.js";

// Cron
import { startProfileSyncCron } from "./crone/user-profile-sync.js";
import { startLeaderboardCron } from "./crone/leaderboard-sync.js";
import { startContestSyncCron } from "./crone/contest-sync.js";
import { startDppSyncCron } from "./crone/dpp-sync.js";

// Workers (Importing starts the worker)
import "./workers/profile-worker.js"; 
import "./workers/friend-worker.js";
import "./workers/leaderboard-worker.js";

dotenv.config();

const app = express();

// ─── Global Rate Limiter ────────────────────────────────────
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,                 // 200 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please try again later." },
});

// ─── Auth Rate Limiter (stricter) ───────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,                  // 20 auth attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many authentication attempts, please try again later." },
});

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
}));
app.use(morgan("dev"));
app.use(globalLimiter);

// Database Connection
connectDB();

// API Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/contests", contestRoutes);
app.use("/api/dpp", dppRoutes);
app.use("/api/admin", adminRoutes);

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
    startContestSyncCron();
    startDppSyncCron();
    console.log("⏰ All cron jobs scheduled...");
});

export default app;