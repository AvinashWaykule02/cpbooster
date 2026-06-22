import { Router } from "express";
import {
  getOverview,
  getRatingGraph,
  getTopicDistribution,
  getStreakHeatmap,
  getContestPerformance,
} from "../controllers/dashboard.controller.js";
import { authMiddleware } from "../middlewares/auth-middleware.js"; // adjust export name if different

const router = Router();

router.use(authMiddleware); // every dashboard route requires a logged-in user

router.get("/overview", getOverview); // GET /api/dashboard/overview
router.get("/rating-graph", getRatingGraph); // GET /api/dashboard/rating-graph
router.get("/topic-distribution", getTopicDistribution); // GET /api/dashboard/topic-distribution
router.get("/streak", getStreakHeatmap); // GET /api/dashboard/streak
router.get("/contest-performance", getContestPerformance); // GET /api/dashboard/contest-performance

export default router;