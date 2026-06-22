import mongoose from "mongoose";

const userProblemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dailyProblem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyProblem",
    },
    cfProblemId: {
      type: String,
      trim: true,
    },
    contestId: Number,
    index: String,
    name: {
      type: String,
      trim: true,
    },
    rating: Number,
    tags: [String],
    verdict: {
      type: String,
      default: "OK",
    },
    language: String,
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

userProblemSchema.index({ user: 1, createdAt: 1 });
userProblemSchema.index({ user: 1, completed: 1 });
userProblemSchema.index({ user: 1, cfProblemId: 1 }, { unique: true, sparse: true });

export const UserProblem = mongoose.model("UserProblem", userProblemSchema);
