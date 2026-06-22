import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true, 
    },

    codeforcesHandle: {
      type: String,
      required: true,
      unique: true, // important for CP platforms
      trim: true,
      index: true, // fast lookup for CF API sync
    },
  },
  {
    timestamps: true, // replaces createdAt automatically
  }
);

/**
 * Indexing Strategy Summary:
 * 1. email → unique index (login)
 * 2. codeforcesHandle → unique index (CF mapping)
 * 3. role → index (admin/user filtering)
 */

// Extra compound index (optional but useful for leaderboard / search)
userSchema.index({ role: 1, createdAt: -1 });

const User = mongoose.model("User", userSchema);
export default User;