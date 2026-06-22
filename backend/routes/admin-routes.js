import { Router } from "express";
import {
  getAllUsers,
  getUserDetails,
  banUser,
  unbanUser,
  triggerSync,
  getSystemStats,
} from "../controllers/admin-controller.js";
import { protect, adminOnly } from "../middlewares/auth-middleware.js";

const router = Router();

router.use(protect);
router.use(adminOnly);

router.get("/users", getAllUsers);
router.get("/users/:id", getUserDetails);
router.patch("/users/:id/ban", banUser);
router.patch("/users/:id/unban", unbanUser);
router.post("/sync", triggerSync);
router.get("/stats", getSystemStats);

export default router;
