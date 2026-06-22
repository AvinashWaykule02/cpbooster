import mongoose from "mongoose";

const dailyStatsSchema = new mongoose.Schema({
  date: { type: Date, required: true },

  rating: Number,
  ratingChange: Number,
  problemsSolved: Number,
  contestsGiven: Number,
  avgProblemRating: Number,
  activeDays: Number
});

const userStats = new mongoose.Schema({
  cfHandle: {
    type: String,
    required: true,
    unique: true
  },

  // rolling leaderboard window only
  dailyStats: [dailyStatsSchema],

  leaderboard30d: {
    solved: { type: Number, default: 0 },
    ratingGain: { type: Number, default: 0 },
    contests: { type: Number, default: 0 },
    activeDays: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    windowStart: Date,
    windowEnd: Date,
    syncedAt: Date
  }

}, { timestamps: true });

export const UserStats = mongoose.model("UserStats", userStats);
