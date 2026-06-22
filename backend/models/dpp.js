import mongoose from "mongoose";

const dppSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true,
    },
    problem: {
      contestId: Number,
      index: String,
      name: { type: String, required: true },
      rating: Number,
      tags: [String],
      url: String,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    topic: {
      type: String,
      required: true,
    },
    solvers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        solvedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

dppSchema.index({ date: -1 });

export const DPP = mongoose.model("DPP", dppSchema);
