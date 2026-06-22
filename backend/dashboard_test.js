import axios from "axios";
import mongoose from "mongoose";
import dotenv from "dotenv";

// ─────────────────────────────────────────────────────────────
// Load environment variables (MONGO_URI, JWT_ACCESS_SECRET, etc.)
// ─────────────────────────────────────────────────────────────
dotenv.config();

const BASE_URL = process.env.API_URL || "http://localhost:5000";
const AUTH_URL = `${BASE_URL}/api/auth`;
const DASHBOARD_URL = `${BASE_URL}/api/dashboard`;

// ─────────────────────────────────────────────────────────────
// Cookie handling — same pattern as test_api.js & test_leaderboard.js
// ─────────────────────────────────────────────────────────────
let cookies = "";

const getHeaders = () => ({
  headers: { Cookie: cookies },
});

const updateCookies = (res) => {
  if (res.headers["set-cookie"]) {
    const parsed = res.headers["set-cookie"].map((c) => c.split(";")[0]);
    cookies = parsed.join("; ");
  }
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────
// Unique test user for this run
// ─────────────────────────────────────────────────────────────
const uniqueId = Date.now();
const TEST_USER = {
  name: "Dashboard Tester",
  email: `dash_test_${uniqueId}@example.com`,
  password: "password123",
  codeforcesHandle: `dash_tester_${uniqueId}`, // fake handle — we seed data directly
};

// ─────────────────────────────────────────────────────────────
// MongoDB Models — imported inline so the test script is self-contained
// ─────────────────────────────────────────────────────────────

// We need to import the real models so Mongoose knows about them
// (required for aggregation $lookup to work on the correct collections)
import User from "./models/user.js";
import Contest from "./models/contest.js";
import PastContest from "./models/past-contest.js";

// ── UserProblem model ───────────────────────────────────────
// This model may not exist yet in the project. We define it here
// so the test can seed data. If you've already created models/userproblem.js
// with the same schema, you can replace this with:
//   import { UserProblem } from "./models/userproblem.js";
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
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);
userProblemSchema.index({ user: 1, createdAt: 1 });
const UserProblem =
  mongoose.models.UserProblem ||
  mongoose.model("UserProblem", userProblemSchema);

// ── DailyProblem model ──────────────────────────────────────
// Same approach — define inline so the test is self-contained.
const dailyProblemSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true },
    title: { type: String },
    difficulty: { type: Number },
  },
  { timestamps: true }
);
const DailyProblem =
  mongoose.models.DailyProblem ||
  mongoose.model("DailyProblem", dailyProblemSchema);

// ─────────────────────────────────────────────────────────────
// IDs we'll seed — stored here so cleanup can find them
// ─────────────────────────────────────────────────────────────
let seededUserId = null;
const seededContestIds = [];
const seededParticipationIds = [];
const seededProblemIds = [];
const seededDailyProblemIds = [];

// ═════════════════════════════════════════════════════════════
//  SEED TEST DATA
// ═════════════════════════════════════════════════════════════
const seedTestData = async (userId) => {
  console.log("\n📦 Seeding test data into MongoDB...\n");

  // ── 1. Update user with currentRating / maxRating / currentStreak ──
  // The dashboard-service.js queries these fields on the User model.
  // If your User schema doesn't have them yet, Mongoose will still
  // set them (schema is flexible with {strict: true} by default, but
  // we can use updateOne with $set which bypasses strict).
  await User.collection.updateOne(
    { _id: userId },
    {
      $set: {
        currentRating: 1587,
        maxRating: 1823,
        currentStreak: 14,
      },
    }
  );
  console.log("  ✅ User updated with currentRating=1587, maxRating=1823, currentStreak=14");

  // ── 2. Create 5 Contests ──────────────────────────────────
  const contestData = [
    { contestId: 800, name: "Codeforces Round #800 (Div. 2)", startTime: new Date("2024-01-15"), duration: 120, status: "FINISHED" },
    { contestId: 810, name: "Codeforces Round #810 (Div. 2)", startTime: new Date("2024-03-10"), duration: 135, status: "FINISHED" },
    { contestId: 160, name: "Educational CF Round 160",       startTime: new Date("2024-05-20"), duration: 120, status: "FINISHED" },
    { contestId: 850, name: "Codeforces Round #850 (Div. 1)", startTime: new Date("2024-08-05"), duration: 150, status: "FINISHED" },
    { contestId: 900, name: "Codeforces Round #900 (Div. 2)", startTime: new Date("2024-11-22"), duration: 120, status: "FINISHED" },
  ];

  const contests = await Contest.insertMany(contestData);
  contests.forEach((c) => seededContestIds.push(c._id));
  console.log(`  ✅ Created ${contests.length} contests`);

  // ── 3. Create PastContest for each contest ────────
  const participationData = [
    { userId: userId, handle: TEST_USER.codeforcesHandle, contestId: 800, contestName: "Codeforces Round #800", rank: 1200, oldRating: 1400, newRating: 1450, ratingChange: 50 },
    { userId: userId, handle: TEST_USER.codeforcesHandle, contestId: 810, contestName: "Codeforces Round #810", rank: 800,  oldRating: 1450, newRating: 1530, ratingChange: 80 },
    { userId: userId, handle: TEST_USER.codeforcesHandle, contestId: 160, contestName: "Educational CF Round 160", rank: 2500, oldRating: 1530, newRating: 1490, ratingChange: -40 },
    { userId: userId, handle: TEST_USER.codeforcesHandle, contestId: 850, contestName: "Codeforces Round #850", rank: 450,  oldRating: 1490, newRating: 1587, ratingChange: 97 },
    { userId: userId, handle: TEST_USER.codeforcesHandle, contestId: 900, contestName: "Codeforces Round #900", rank: 950,  oldRating: 1587, newRating: 1610, ratingChange: 23 },
  ];

  const participations = await PastContest.insertMany(participationData);
  participations.forEach((p) => seededParticipationIds.push(p._id));
  console.log(`  ✅ Created ${participations.length} past contest records`);

  // ── 4. Create DailyProblems (topics for distribution chart) ─
  const topicsData = [
    { topic: "Dynamic Programming", title: "Knapsack Problem",     difficulty: 1700 },
    { topic: "Graphs",              title: "BFS Shortest Path",    difficulty: 1500 },
    { topic: "Greedy",              title: "Activity Selection",   difficulty: 1200 },
    { topic: "Dynamic Programming", title: "LIS Problem",          difficulty: 1800 },
    { topic: "Math",                title: "GCD & LCM",            difficulty: 1100 },
    { topic: "Graphs",              title: "Dijkstra's Algorithm", difficulty: 1900 },
    { topic: "Strings",             title: "KMP Matching",         difficulty: 1600 },
    { topic: "Dynamic Programming", title: "Coin Change",          difficulty: 1400 },
  ];

  const dailyProblems = await DailyProblem.insertMany(topicsData);
  dailyProblems.forEach((dp) => seededDailyProblemIds.push(dp._id));
  console.log(`  ✅ Created ${dailyProblems.length} daily problems`);

  // ── 5. Create UserProblem records (solved problems) ────────
  // Spread across different dates for the streak heatmap test
  const now = new Date();
  const userProblemData = dailyProblems.map((dp, i) => {
    const solvedDate = new Date(now);
    solvedDate.setDate(solvedDate.getDate() - i * 3); // every 3 days going back
    return {
      user: userId,
      dailyProblem: dp._id,
      completed: true,
      createdAt: solvedDate,
      updatedAt: solvedDate,
    };
  });

  // Add a few incomplete problems too
  userProblemData.push({
    user: userId,
    dailyProblem: dailyProblems[0]._id,
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const userProblems = await UserProblem.insertMany(userProblemData);
  userProblems.forEach((up) => seededProblemIds.push(up._id));
  console.log(`  ✅ Created ${userProblems.length} user problem records (${userProblems.length - 1} completed, 1 incomplete)`);

  console.log("\n📦 Seeding complete!\n");
};

// ═════════════════════════════════════════════════════════════
//  CLEANUP SEEDED DATA
// ═════════════════════════════════════════════════════════════
const cleanup = async () => {
  console.log("\n🧹 Cleaning up test data...");

  try {
    if (seededProblemIds.length) {
      await UserProblem.deleteMany({ _id: { $in: seededProblemIds } });
      console.log(`  ✅ Deleted ${seededProblemIds.length} UserProblem records`);
    }

    if (seededDailyProblemIds.length) {
      await DailyProblem.deleteMany({ _id: { $in: seededDailyProblemIds } });
      console.log(`  ✅ Deleted ${seededDailyProblemIds.length} DailyProblem records`);
    }

    if (seededParticipationIds.length) {
      await PastContest.deleteMany({ _id: { $in: seededParticipationIds } });
      console.log(`  ✅ Deleted ${seededParticipationIds.length} PastContest records`);
    }

    if (seededContestIds.length) {
      await Contest.deleteMany({ _id: { $in: seededContestIds } });
      console.log(`  ✅ Deleted ${seededContestIds.length} Contest records`);
    }

    if (seededUserId) {
      // Reset the fields we added, or delete the user entirely
      await User.findByIdAndDelete(seededUserId);
      console.log(`  ✅ Deleted test user`);
    }

    console.log("🧹 Cleanup complete!\n");
  } catch (err) {
    console.error("⚠️  Cleanup error:", err.message);
  }
};

// ═════════════════════════════════════════════════════════════
//  DASHBOARD TEST FUNCTIONS
// ═════════════════════════════════════════════════════════════

const testOverview = async () => {
  console.log("─── Test 1: GET /api/dashboard/overview ───");
  try {
    const res = await axios.get(`${DASHBOARD_URL}/overview`, getHeaders());
    console.log(`  ✅ Status: ${res.status}`);
    const d = res.data.data;
    console.log(`  📊 Current Rating : ${d.currentRating}`);
    console.log(`  📊 Max Rating     : ${d.maxRating}`);
    console.log(`  📊 Solved Problems: ${d.solvedProblems}`);
    console.log(`  📊 Contests       : ${d.contests}`);
    console.log(`  📊 Current Streak : ${d.currentStreak}`);

    // Assertions
    if (d.currentRating !== 1587) console.warn(`  ⚠️  Expected currentRating=1587, got ${d.currentRating}`);
    if (d.maxRating !== 1823) console.warn(`  ⚠️  Expected maxRating=1823, got ${d.maxRating}`);
    if (d.solvedProblems !== 8) console.warn(`  ⚠️  Expected solvedProblems=8, got ${d.solvedProblems}`);
    if (d.contests !== 5) console.warn(`  ⚠️  Expected contests=5, got ${d.contests}`);
    if (d.currentStreak !== 14) console.warn(`  ⚠️  Expected currentStreak=14, got ${d.currentStreak}`);
    console.log("");
  } catch (err) {
    console.error(`  ❌ FAILED:`, err.response?.data || err.message);
    console.log("");
  }
};

const testRatingGraph = async () => {
  console.log("─── Test 2: GET /api/dashboard/rating-graph ───");
  try {
    const res = await axios.get(`${DASHBOARD_URL}/rating-graph`, getHeaders());
    console.log(`  ✅ Status: ${res.status}`);
    const data = res.data.data;
    console.log(`  📈 Data points: ${data.length}`);

    if (data.length > 0) {
      console.log("  📈 Rating progression:");
      data.forEach((point, i) => {
        console.log(`     ${i + 1}. ${point.contestName} → rating ${point.rating}`);
      });
    }

    if (data.length !== 5) console.warn(`  ⚠️  Expected 5 data points, got ${data.length}`);
    // Should be sorted chronologically (ascending by contest date)
    if (data.length >= 2 && data[0].rating > data[data.length - 1].rating) {
      console.log(`  ℹ️  First rating: ${data[0].rating}, Last rating: ${data[data.length - 1].rating}`);
    }
    console.log("");
  } catch (err) {
    console.error(`  ❌ FAILED:`, err.response?.data || err.message);
    console.log("");
  }
};

const testTopicDistribution = async () => {
  console.log("─── Test 3: GET /api/dashboard/topic-distribution ───");
  try {
    const res = await axios.get(`${DASHBOARD_URL}/topic-distribution`, getHeaders());
    console.log(`  ✅ Status: ${res.status}`);
    const data = res.data.data;
    console.log(`  🏷️  Topics found: ${data.length}`);

    if (data.length > 0) {
      console.log("  🏷️  Distribution:");
      data.forEach((t) => {
        const bar = "█".repeat(t.count) + "░".repeat(5 - t.count);
        console.log(`     ${bar} ${t.topic}: ${t.count} problems`);
      });
    }

    // We seeded 3 DP, 2 Graphs, 1 Greedy, 1 Math, 1 Strings
    const dpTopic = data.find((t) => t.topic === "Dynamic Programming");
    if (dpTopic && dpTopic.count !== 3) {
      console.warn(`  ⚠️  Expected DP count=3, got ${dpTopic.count}`);
    }
    console.log("");
  } catch (err) {
    console.error(`  ❌ FAILED:`, err.response?.data || err.message);
    console.log("");
  }
};

const testStreakHeatmap = async () => {
  console.log("─── Test 4: GET /api/dashboard/streak?days=365 ───");
  try {
    const res = await axios.get(`${DASHBOARD_URL}/streak?days=365`, getHeaders());
    console.log(`  ✅ Status: ${res.status}`);
    const data = res.data.data;
    console.log(`  🔥 Active days in heatmap: ${data.length}`);

    if (data.length > 0) {
      console.log("  🔥 Recent activity:");
      data.slice(-5).forEach((day) => {
        const heat = "🟩".repeat(Math.min(day.count, 5));
        console.log(`     ${day.date}: ${heat} (${day.count} solved)`);
      });
    }

    if (data.length < 1) {
      console.warn("  ⚠️  Expected at least 1 active day in heatmap");
    }
    console.log("");
  } catch (err) {
    console.error(`  ❌ FAILED:`, err.response?.data || err.message);
    console.log("");
  }
};

const testStreakHeatmapCustomDays = async () => {
  console.log("─── Test 4b: GET /api/dashboard/streak?days=30 ───");
  try {
    const res = await axios.get(`${DASHBOARD_URL}/streak?days=30`, getHeaders());
    console.log(`  ✅ Status: ${res.status}`);
    const data = res.data.data;
    console.log(`  🔥 Active days (last 30): ${data.length}`);
    console.log("");
  } catch (err) {
    console.error(`  ❌ FAILED:`, err.response?.data || err.message);
    console.log("");
  }
};

const testContestPerformance = async () => {
  console.log("─── Test 5: GET /api/dashboard/contest-performance ───");
  try {
    const res = await axios.get(`${DASHBOARD_URL}/contest-performance`, getHeaders());
    console.log(`  ✅ Status: ${res.status}`);
    const d = res.data.data;
    console.log(`  🏆 Total Contests    : ${d.totalContests}`);
    console.log(`  🏆 Best Rank         : ${d.bestRank}`);
    console.log(`  🏆 Average Rank      : ${d.averageRank}`);
    console.log(`  🏆 Total Rating Gain : ${d.totalRatingGain}`);
    console.log(`  🏆 Avg Rating Gain   : ${d.averageRatingGain}`);

    // Assertions based on seeded data
    // Ranks: 1200, 800, 2500, 450, 950 → best=450
    // RatingChanges: 50, 80, -40, 97, 23 → total=210, avg=42
    if (d.totalContests !== 5) console.warn(`  ⚠️  Expected totalContests=5, got ${d.totalContests}`);
    if (d.bestRank !== 450) console.warn(`  ⚠️  Expected bestRank=450, got ${d.bestRank}`);
    if (d.totalRatingGain !== 210) console.warn(`  ⚠️  Expected totalRatingGain=210, got ${d.totalRatingGain}`);
    console.log("");
  } catch (err) {
    console.error(`  ❌ FAILED:`, err.response?.data || err.message);
    console.log("");
  }
};

// ═════════════════════════════════════════════════════════════
//  TEST UNAUTHENTICATED ACCESS (should fail with 401)
// ═════════════════════════════════════════════════════════════
const testUnauthenticated = async () => {
  console.log("─── Test 6: Unauthenticated access (expect 401) ───");
  const endpoints = [
    "/overview",
    "/rating-graph",
    "/topic-distribution",
    "/streak",
    "/contest-performance",
  ];

  let allPassed = true;
  for (const ep of endpoints) {
    try {
      await axios.get(`${DASHBOARD_URL}${ep}`);
      console.error(`  ❌ ${ep} — expected 401 but got 200!`);
      allPassed = false;
    } catch (err) {
      if (err.response?.status === 401) {
        console.log(`  ✅ ${ep} → 401 (correctly rejected)`);
      } else {
        console.error(`  ❌ ${ep} → ${err.response?.status || err.message} (expected 401)`);
        allPassed = false;
      }
    }
  }
  if (allPassed) console.log("  ✅ All unauthenticated requests correctly blocked!");
  console.log("");
};

// ═════════════════════════════════════════════════════════════
//  MAIN TEST RUNNER
// ═════════════════════════════════════════════════════════════
const runDashboardTests = async () => {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║        CPBooster — Dashboard API Test Suite         ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  // ── Step 0: Connect to MongoDB directly ─────────────────────
  console.log("🔌 Connecting to MongoDB...");
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI not set in .env file. Cannot run tests.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}\n`);
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }

  try {
    // ── Step 1: Signup a test user via API ─────────────────────
    console.log("══════ STEP 1: Create & Authenticate Test User ══════\n");
    console.log(`📝 Signing up as: ${TEST_USER.email}`);
    let res = await axios.post(`${AUTH_URL}/signup`, TEST_USER);
    console.log(`✅ Signup successful! Status: ${res.status}`);
    updateCookies(res);
    seededUserId = new mongoose.Types.ObjectId(res.data.user.id);
    console.log(`🔑 User ID: ${seededUserId}`);
    console.log(`🍪 Auth cookie set: ${cookies !== ""}\n`);

    // ── Step 2: Seed dashboard data into MongoDB ──────────────
    console.log("══════ STEP 2: Seed Test Data ══════\n");
    await seedTestData(seededUserId);

    // Wait briefly for any async processes
    console.log("⏳ Waiting 2s for data to settle...\n");
    await sleep(2000);

    // ── Step 3: Test unauthenticated access ───────────────────
    console.log("══════ STEP 3: Test Unauthenticated Access ══════\n");
    await testUnauthenticated();

    // ── Step 4: Run all dashboard route tests ─────────────────
    console.log("══════ STEP 4: Test All Dashboard Routes (Authenticated) ══════\n");
    await testOverview();
    await testRatingGraph();
    await testTopicDistribution();
    await testStreakHeatmap();
    await testStreakHeatmapCustomDays();
    await testContestPerformance();

    // ── Step 5: Test with fresh login (token rotation check) ──
    console.log("══════ STEP 5: Re-login & Re-test Overview ══════\n");
    console.log("🔄 Logging out...");
    await axios.post(`${AUTH_URL}/logout`, {}, getHeaders());
    cookies = "";
    console.log("✅ Logged out\n");

    console.log("🔄 Logging back in...");
    res = await axios.post(`${AUTH_URL}/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password,
    });
    updateCookies(res);
    console.log(`✅ Re-login successful! Cookie refreshed: ${cookies !== ""}\n`);

    // Quick re-test of overview to confirm login works
    console.log("─── Re-test: GET /api/dashboard/overview ───");
    res = await axios.get(`${DASHBOARD_URL}/overview`, getHeaders());
    console.log(`  ✅ Status: ${res.status}`);
    console.log(`  📊 Rating: ${res.data.data.currentRating}\n`);

  } catch (err) {
    console.error("\n💥 FATAL ERROR:", err.response?.data || err.message);
    if (err.response) {
      console.error(`   Status: ${err.response.status}`);
      console.error(`   URL: ${err.config?.url}`);
    }
  } finally {
    // ── Step 6: Cleanup ─────────────────────────────────────
    console.log("══════ STEP 6: Cleanup ══════");
    await cleanup();

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected");

    console.log("\n╔══════════════════════════════════════════════════════╗");
    console.log("║         ALL DASHBOARD TESTS COMPLETED!              ║");
    console.log("╚══════════════════════════════════════════════════════╝\n");
  }
};

runDashboardTests();
