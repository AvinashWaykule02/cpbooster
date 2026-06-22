import {
  addFriendService,
  removeFriendService,
  listFriendsService,
  getFriendsLeaderboardService,
} from "../services/leaderboard-service.js";
import { getUserInfo } from "../services/codeforces.api.js";
import { fetchAndUpdateStats } from "../services/fetch-stats-data.js";

// GET /api/leaderboard
export const getLeaderboard = async (req, res) => {
  try {
    const userId = req.user.id; // set by auth-middleware — adjust if your payload uses _id
    const leaderboard = await getFriendsLeaderboardService(userId);
    res.status(200).json({ success: true, data: leaderboard });
  } catch (err) {
    console.error("❌ Leaderboard error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Error fetching leaderboard", error: err.message });
  }
};

// GET /api/leaderboard/friends
export const getFriends = async (req, res) => {
  try {
    const friends = await listFriendsService(req.user.id);
    res.status(200).json({ success: true, data: friends });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/leaderboard/friends   body: { handle }
export const addFriend = async (req, res) => {
  try {
    const userId = req.user.id;
    const { handle } = req.body;

    if (!handle?.trim()) {
      return res.status(400).json({ success: false, message: "handle is required" });
    }

    // validate the handle actually exists on Codeforces BEFORE saving it
    const [cfUser] = await getUserInfo([handle.trim()]);
    if (!cfUser) {
      return res
        .status(404)
        .json({ success: false, message: `"${handle}" is not a valid Codeforces handle` });
    }

    const friend = await addFriendService(userId, cfUser.handle);

    // Fetch the rolling 30-day leaderboard data immediately so the next
    // leaderboard read does not show stale Redis data for this handle.
    await fetchAndUpdateStats(cfUser.handle);

    res.status(201).json({
      success: true,
      data: friend,
      message: "Friend added and 30-day stats synced",
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Already in your friend list" });
    }
    console.error("❌ Add friend error:", err.message);
    res.status(500).json({ success: false, message: "Error adding friend", error: err.message });
  }
};

// DELETE /api/leaderboard/friends/:handle
export const removeFriend = async (req, res) => {
  try {
    const userId = req.user.id;
    const { handle } = req.params;

    const removed = await removeFriendService(userId, handle);
    if (!removed) {
      return res.status(404).json({ success: false, message: "Friend not found in your list" });
    }

    // NOTE: we don't touch Redis/UserStats here on purpose — the handle's
    // global stats may still be tracked by other users' friend lists or
    // by the daily cron, so global data is left intact. Only the link
    // between this user and that handle is removed.
    res.status(200).json({ success: true, message: `Removed ${handle} from your friend list` });
  } catch (err) {
    console.error("❌ Remove friend error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Error removing friend", error: err.message });
  }
};
