import { Router } from "express";
import {
  getTodayProblem,
  getPastProblems,
  markSolved,
} from "../controllers/dpp-controller.js";
import { protect } from "../middlewares/auth-middleware.js";

const router = Router();

router.get("/today", getTodayProblem);          // public
router.get("/history", getPastProblems);         // public
router.post("/solve", protect, markSolved);      // protected

export default router;
