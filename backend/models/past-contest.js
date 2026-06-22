import mongoose from "mongoose";

const pastContestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    handle: {
      type: String,
      required: true,
    },

    contestId: {
      type: Number,
      required: true,
      index: true,
    },

    contestName: {
      type: String,
      required: true,
    },

    rank: {
      type: Number,
      required: true,
    },

    oldRating: {
      type: Number,
      default: null,
    },

    newRating: {
      type: Number,
      default: null,
    },

    ratingChange: {
      type: Number,
      default: 0,
    },

    problemsSolved: {
      type: Number,
      default: 0,
    },

    totalSubmissions: {
      type: Number,
      default: 0,
    },

    accuracy: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },

    participants: {
      type: Number,
      default: 0,
    },

    performancePercentile: {
      type: Number,
      default: 0,
    }, // (participants - rank) / participants
  },
  {
    timestamps: true,
  }
);

// prevent duplicate entries
pastContestSchema.index({ userId: 1, contestId: 1 }, { unique: true });

export default mongoose.model("PastContest", pastContestSchema);