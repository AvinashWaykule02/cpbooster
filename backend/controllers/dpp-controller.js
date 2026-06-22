import {
  getTodayProblemService,
  getPastProblemsService,
  markSolvedService,
} from "../services/dpp-service.js";

// GET /api/dpp/today
export const getTodayProblem = async (req, res) => {
  try {
    const data = await getTodayProblemService();
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/dpp/history?page=1&limit=10
export const getPastProblems = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const data = await getPastProblemsService(page, limit);
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/dpp/solve  body: { dppId }
export const markSolved = async (req, res) => {
  try {
    const { dppId } = req.body;
    if (!dppId) {
      return res.status(400).json({ success: false, message: "dppId is required" });
    }
    const result = await markSolvedService(req.user.id, dppId);
    if (result.alreadySolved) {
      return res.status(200).json({ success: true, message: "Already solved", data: result.dpp });
    }
    res.status(200).json({ success: true, message: "Marked as solved", data: result.dpp });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
