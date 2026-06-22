import jwt from "jsonwebtoken";
import User from "../models/user.js";

/*
==================== 🔐 PROTECT MIDDLEWARE ====================
*/
const protect = async (req, res, next) => {
    try {
        const token = req.cookies.accessToken;

        if (!token) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = user;
        next();

    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

/*
==================== 🛡️ ADMIN MIDDLEWARE ====================
*/
const adminOnly = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Admin access denied" });
        }

        next();

    } catch (err) {
        return res.status(500).json({ message: "Server error" });
    }
};

/*
==================== 📤 EXPLICIT EXPORTS ====================
*/
export {
    protect,
    adminOnly
};