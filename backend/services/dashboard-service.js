import mongoose from "mongoose";
import { User } from "../models/User.js";
import { ContestParticipation } from "../models/ContestParticipation.js";
import { UserProblem } from "../models/UserProblem.js";

/**
 * ============================================================
 * FEATURE 1 — Overview Cards
 * ============================================================
 * Three small, independent, indexed queries run in PARALLEL via
 * Promise.all — NOT three sequential awaits, and NOT one giant
 * cross-collection aggregation. For 3 cheap counts/lookups, parallel
 * simple queries are both faster to write/explain AND just as fast
 * to execute as a fancier single aggregation would be here.
 *
 * .lean()      -> skips Mongoose document hydration, returns plain JS objects
 * .select()    -> projection: only pull the 3 fields we actually need
 * countDocuments() -> uses the {user:1} index, doesn't load the docs themselves
 */
export const getOverviewService = async (userId) => {
  const [user, contests, solvedProblems] = await Promise.all([
    User.findById(userId).select("currentRating maxRating currentStreak").lean(),
    ContestParticipation.countDocuments({ user: userId }),
    UserProblem.countDocuments({ user: userId, completed: true }),
  ]);

  if (!user) {
    throw new Error("User not found");
  }

  return {
    currentRating: user.currentRating ?? 0,
    maxRating: user.maxRating ?? 0,
    solvedProblems,
    contests,
    currentStreak: user.currentStreak ?? 0,
  };
};

/**
 * ============================================================
 * FEATURE 2 — Rating Progress Graph
 * ============================================================
 * `contest` on ContestParticipation is now a real ObjectId reference
 * to the Contest model, so this joins in the contest's name + date:
 *
 *   1. $match      — only this user's participations
 *   2. $lookup     — pull in the matching Contest doc for each row
 *   3. $unwind     — $lookup always returns an array; we know it's
 *                    exactly 1 match (contest is required), so unwind
 *                    flattens it back to a single object per row
 *   4. $sort       — chronological order by the CONTEST's date (not
 *                    when the participation record was created —
 *                    those could differ if data is backfilled later)
 *   5. $project    — shape the output to exactly what the line chart needs
 */
export const getRatingGraphService = async (userId) => {
  const uid = new mongoose.Types.ObjectId(userId);

  const data = await ContestParticipation.aggregate([
    { $match: { user: uid } },
    {
      $lookup: {
        from: "contests", // Mongoose's default collection name for model "Contest"
        localField: "contest",
        foreignField: "_id",
        as: "contestInfo",
      },
    },
    { $unwind: "$contestInfo" },
    { $sort: { "contestInfo.date": 1 } },
    {
      $project: {
        _id: 0,
        contestName: "$contestInfo.name",
        rating: "$newRating",
      },
    },
  ]);

  return data;
};

/**
 * ============================================================
 * FEATURE 3 — Topic Distribution
 * ============================================================
 * This ONE genuinely needs a $lookup: `topic` lives on DailyProblem,
 * not on UserProblem. Pipeline: filter to this user's completed
 * problems -> join in the DailyProblem doc -> group by topic -> count.
 */
export const getTopicDistributionService = async (userId) => {
  const uid = new mongoose.Types.ObjectId(userId);

  const data = await UserProblem.aggregate([
    { $match: { user: uid, completed: true } },
    {
      $lookup: {
        from: "dailyproblems", // Mongoose's default collection name for model "DailyProblem"
        localField: "dailyProblem",
        foreignField: "_id",
        as: "problemInfo",
      },
    },
    { $unwind: "$problemInfo" },
    {
      $group: {
        _id: "$problemInfo.topic",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    {
      $project: {
        _id: 0,
        topic: "$_id",
        count: 1,
      },
    },
  ]);

  return data;
};

/**
 * ============================================================
 * FEATURE 4 — Daily Streak Heatmap
 * ============================================================
 * Groups completed problems by calendar day using $dateToString, over
 * a bounded window (default 365 days — GitHub-style heatmaps only ever
 * show 1 year, so there's no reason to scan the user's entire history).
 *
 * The {user:1, createdAt:1} index makes the date-range $match cheap
 * even as a user's problem history grows.
 */
export const getStreakHeatmapService = async (userId, days = 365) => {
  const uid = new mongoose.Types.ObjectId(userId);

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const data = await UserProblem.aggregate([
    {
      $match: {
        user: uid,
        completed: true,
        createdAt: { $gte: fromDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: "$_id",
        count: 1,
      },
    },
  ]);

  return data;
};

/**
 * ============================================================
 * FEATURE 5 — Contest Performance Summary
 * ============================================================
 * A single $group with $min/$avg/$sum accumulators computes all 5
 * numbers in one pass over ContestParticipation — no separate queries
 * for "best rank" vs "average rank" vs "total gain".
 */
export const getContestPerformanceService = async (userId) => {
  const uid = new mongoose.Types.ObjectId(userId);

  const [result] = await ContestParticipation.aggregate([
    { $match: { user: uid } },
    {
      $group: {
        _id: null,
        totalContests: { $sum: 1 },
        bestRank: { $min: "$rank" },
        averageRank: { $avg: "$rank" },
        totalRatingGain: { $sum: "$ratingChange" },
        averageRatingGain: { $avg: "$ratingChange" },
      },
    },
    {
      $project: {
        _id: 0,
        totalContests: 1,
        bestRank: 1,
        averageRank: { $round: ["$averageRank", 0] },
        totalRatingGain: 1,
        averageRatingGain: { $round: ["$averageRatingGain", 1] },
      },
    },
  ]);

  // a user with zero contests gets a clean zeroed object, not a 500 or null
  return (
    result || {
      totalContests: 0,
      bestRank: null,
      averageRank: 0,
      totalRatingGain: 0,
      averageRatingGain: 0,
    }
  );
};