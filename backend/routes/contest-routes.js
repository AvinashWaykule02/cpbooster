import { Router } from "express";
import {
  getUpcomingContests,
  getUserContestHistory,
  syncContests,
} from "../controllers/contest-controller.js";
import { protect } from "../middlewares/auth-middleware.js";

const router = Router();

router.get("/upcoming", getUpcomingContests);          // public
router.get("/history", protect, getUserContestHistory); // protected
router.post("/sync", protect, syncContests);            // protected

export default router;
