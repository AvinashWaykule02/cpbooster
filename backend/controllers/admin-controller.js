import User from "../models/user.js";
import { UserStats } from "../models/leaderboard.js";
import Profile from "../models/userprofile.js";
import { runDailyLeaderboardSync } from "../crone/leaderboard-sync.js";

// GET /api/admin/users?page=1&limit=20
export const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find()
        .select("-password -refreshToken")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/users/:id
export const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password -refreshToken")
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const [profile, stats] = await Promise.all([
      Profile.findOne({ handle: user.codeforcesHandle }).lean(),
      UserStats.findOne({ cfHandle: user.codeforcesHandle }).lean(),
    ]);

    res.status(200).json({
      success: true,
      data: { user, profile, stats },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/users/:id/ban
export const banUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { role: "banned" } },
      { new: true }
    ).select("-password -refreshToken");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, message: "User banned", data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/users/:id/unban
export const unbanUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { role: "user" } },
      { new: true }
    ).select("-password -refreshToken");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, message: "User unbanned", data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/sync
export const triggerSync = async (req, res) => {
  try {
    // Fire and forget — runs in background
    runDailyLeaderboardSync().catch((err) =>
      console.error("[ADMIN] Manual sync failed:", err.message)
    );

    res.status(200).json({
      success: true,
      message: "Leaderboard sync triggered. Check server logs for progress.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/stats
export const getSystemStats = async (req, res) => {
  try {
    const [totalUsers, totalProfiles, totalTracked] = await Promise.all([
      User.countDocuments(),
      Profile.countDocuments(),
      UserStats.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalProfiles,
        totalTrackedHandles: totalTracked,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
