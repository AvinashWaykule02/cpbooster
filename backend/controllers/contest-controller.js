import {
  getUpcomingContestsService,
  getUserContestHistoryService,
  syncUserContests,
} from "../services/contest-service.js";

// GET /api/contests/upcoming
export const getUpcomingContests = async (req, res) => {
  try {
    const data = await getUpcomingContestsService();
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/contests/history
export const getUserContestHistory = async (req, res) => {
  try {
    const data = await getUserContestHistoryService(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/contests/sync
export const syncContests = async (req, res) => {
  try {
    const count = await syncUserContests(req.user.id, req.user.codeforcesHandle);
    res.status(200).json({ success: true, message: `Synced ${count} contests` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
