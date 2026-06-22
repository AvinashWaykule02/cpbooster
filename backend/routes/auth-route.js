import express from "express";
import {
    signup,
    login,
    logout,
    getUserProfile,
    searchHandles
} from "../controllers/auth-controller.js";

import { protect } from "../middlewares/auth-middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

router.post("/logout", protect, logout);

router.get("/profile", protect, getUserProfile);
router.get("/search-handles", protect, searchHandles);

export default router;