import mongoose from "mongoose";

const contestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    platform: { type: String, default: "Codeforces", trim: true },

    // contest start time — what the rating graph sorts on
    date: { type: Date, required: true },

    durationMinutes: Number,
  },
  { timestamps: true }
);

// rating graph and any "list contests chronologically" query benefit from this
contestSchema.index({ date: -1 });

export const Contest = mongoose.model("Contest", contestSchema);