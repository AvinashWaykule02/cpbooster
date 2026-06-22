import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    // =========================
    // 🔗 LINK TO USER
    // =========================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
      unique: true,
      sparse: true,
    },

    // =========================
    // 👨‍💻 CODEFORCES INFO
    // =========================
    handle: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    firstName: {
      type: String,
      trim: true,
    },

    lastName: {
      type: String,
      trim: true,
    },

    country: String,
    city: String,
    organization: String,

    avatar: String,
    titlePhoto: String,

    // =========================
    // 📊 RATING INFO (CF CORE)
    // =========================
    rating: {
      type: Number,
      default: 0,
      index: true,
    },

    maxRating: {
      type: Number,
      default: 0,
    },

    rank: String,
    maxRank: String,

    contribution: {
      type: Number,
      default: 0,
    },

    friendOfCount: {
      type: Number,
      default: 0,
    },

    // =========================
    // ⏱️ ACTIVITY INFO
    // =========================
    lastOnlineTimeSeconds: {
      type: Number,
    },

    registrationTimeSeconds: {
      type: Number,
    },

    // =========================
    // 📈 YOUR PLATFORM ANALYTICS
    // =========================
    solvedCount: {
      type: Number,
      default: 0,
      index: true,
    },

  },
  {
    timestamps: true,
  }
);

// =========================
// 🚀 INDEXES FOR PERFORMANCE
// =========================
profileSchema.index({ handle: 1 });
profileSchema.index({ rating: -1 });
profileSchema.index({ maxRating: -1 });
profileSchema.index({ solvedCount: -1 });
profileSchema.index({ lastSyncAt: -1 });

// =========================
// ⚡ VIRTUAL (OPTIONAL)
// =========================
profileSchema.virtual("ratingColor").get(function () {
  if (this.rating < 1200) return "gray";
  if (this.rating < 1400) return "green";
  if (this.rating < 1600) return "cyan";
  if (this.rating < 1900) return "blue";
  if (this.rating < 2100) return "violet";
  if (this.rating < 2400) return "orange";
  return "red";
});

profileSchema.set("toJSON", { virtuals: true });
profileSchema.set("toObject", { virtuals: true });

const Profile = mongoose.model("Profile", profileSchema);

export default Profile;