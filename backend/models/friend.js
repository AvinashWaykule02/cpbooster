import mongoose from "mongoose";

const friendSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    friendHandle: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
  },
  { timestamps: true }
);

// a user can't add the same handle twice — also lets us rely on a
// duplicate-key error (code 11000) instead of a manual pre-check
friendSchema.index({ userId: 1, friendHandle: 1 }, { unique: true });

export const Friend = mongoose.model("Friend", friendSchema);