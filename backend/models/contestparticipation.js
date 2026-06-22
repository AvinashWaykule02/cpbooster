import mongoose from "mongoose";

const contestParticipationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    contest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      required: true,
      index: true,
    },

    rank: { type: Number, required: true },
    oldRating: { type: Number, required: true },
    newRating: { type: Number, required: true },
    ratingChange: { type: Number, required: true },
  },
  { timestamps: true }
);

// a user can only have ONE participation record per contest
contestParticipationSchema.index({ user: 1, contest: 1 }, { unique: true });

// powers: Overview Cards' contest count, Contest Performance aggregation
contestParticipationSchema.index({ user: 1, createdAt: 1 });

export const ContestParticipation = mongoose.model(
  "ContestParticipation",
  contestParticipationSchema
);