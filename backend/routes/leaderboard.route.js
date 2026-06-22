import { Router } from "express";
import {
  getLeaderboard,
  getFriends,
  addFriend,
  removeFriend,
} from "../controllers/leaderboard-controller.js";
import { protect } from "../middlewares/auth-middleware.js";

const router = Router();

router.use(protect); // every leaderboard route requires a logged-in user

router.get("/", getLeaderboard); // GET    /api/leaderboard
router.get("/friends", getFriends); // GET    /api/leaderboard/friends
router.post("/friends", addFriend); // POST   /api/leaderboard/friends        { handle }
router.delete("/friends/:handle", removeFriend); // DELETE /api/leaderboard/friends/:handle

export default router;