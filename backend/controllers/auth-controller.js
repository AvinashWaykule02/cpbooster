import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import {
    getCodeforcesProfile,
    searchCodeforcesHandles
} from "../services/userprofile-service.js";
import { addProfileSyncJob } from "../job-queues/profile-queue.js";

/*
==================== 🔐 GENERATE TOKENS ====================
*/
const generateAccessToken = (user) => {
    return jwt.sign(
        { id: user._id },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: "15m" }
    );
};



/*
==================== 🔥 SIGNUP ====================
*/
const signup = async (req, res) => {
    try {
        const { name, email, password, codeforcesHandle } = req.body;

        if (!name || !email || !password || !codeforcesHandle) {
            return res.status(422).json({ message: "All fields required" });
        }

        const existingUser = await User.findOne({
            $or: [{ email }, { codeforcesHandle }]
        });

        if (existingUser) {
            return res.status(409).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            codeforcesHandle
        });

        const accessToken = generateAccessToken(user);

        // Immediately add job to sync profile
        await addProfileSyncJob(user._id, user.codeforcesHandle);

        // cookies
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 15 * 60 * 1000
        });

        return res.status(201).json({
            message: "Signup successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                codeforcesHandle: user.codeforcesHandle
            }
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Signup failed" });
    }
};

/*
==================== 🔥 LOGIN ====================
*/
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email & password required" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const accessToken = generateAccessToken(user);

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 15 * 60 * 1000
        });


        return res.status(200).json({
            message: "Login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                codeforcesHandle: user.codeforcesHandle
            }
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Login failed" });
    }
};

/*
==================== 🔄 REFRESH TOKEN ====================
*/


/*
==================== 🚪 LOGOUT ====================
*/
const logout = async (req, res) => {
    try {
        res.clearCookie("accessToken");

        return res.status(200).json({ message: "Logout successful" });

    } catch (err) {
        return res.status(500).json({ message: "Logout failed" });
    }
};

/*
==================== 👤 GET USER PROFILE ====================
*/
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select("-password -refreshToken");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const profileData = await getCodeforcesProfile(
            user.codeforcesHandle
        );

        return res.status(200).json({
            message: "User profile fetched successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                codeforcesHandle: user.codeforcesHandle,
                profileData
            }
        });

    } catch (error) {
        console.error("Get profile error:", error);

        return res.status(500).json({
            message: "Failed to fetch user profile"
        });
    }
};

/*
==================== 🔍 SEARCH HANDLES ====================
*/
const searchHandles = async (req, res) => {
    try {
        const { handle } = req.query;

        if (!handle || !handle.trim()) {
            return res.status(400).json({
                message: "Handle is required"
            });
        }

        const results = await searchCodeforcesHandles(
            handle.trim()
        );

        return res.status(200).json({
            message: "Handle search successful",
            results
        });

    } catch (error) {
        console.error("Search handles error:", error);

        return res.status(500).json({
            message: "Handle search failed"
        });
    }
};


/*
==================== 📤 EXPLICIT EXPORTS ====================
*/
export {
    signup,
    login,
    logout,
    getUserProfile,
    searchHandles
};  