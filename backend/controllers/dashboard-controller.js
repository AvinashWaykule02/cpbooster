import {
  getOverviewService,
  getRatingGraphService,
  getTopicDistributionService,
  getStreakHeatmapService,
  getContestPerformanceService,
} from "../services/dashboard.service.js";

// GET /api/dashboard/overview
export const getOverview = async (req, res) => {
  try {
    const data = await getOverviewService(req.user.id); // adjust if your auth middleware sets req.user._id
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/dashboard/rating-graph
export const getRatingGraph = async (req, res) => {
  try {
    const data = await getRatingGraphService(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/dashboard/topic-distribution
export const getTopicDistribution = async (req, res) => {
  try {
    const data = await getTopicDistributionService(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/dashboard/streak?days=365
export const getStreakHeatmap = async (req, res) => {
  try {
    const days = req.query.days ? Number(req.query.days) : 365;
    const data = await getStreakHeatmapService(req.user.id, days);
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/dashboard/contest-performance
export const getContestPerformance = async (req, res) => {
  try {
    const data = await getContestPerformanceService(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};