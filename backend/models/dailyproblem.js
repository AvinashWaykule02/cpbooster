import mongoose from "mongoose";

const dailyProblemSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true,
    },
    contestId: Number,
    index: String,
    name: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      default: 0,
    },
    tags: [String],
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    url: String,
    solvedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

dailyProblemSchema.index({ date: -1 });
dailyProblemSchema.index({ topic: 1 });

export const DailyProblem = mongoose.model("DailyProblem", dailyProblemSchema);
