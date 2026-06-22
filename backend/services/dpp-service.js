import { DPP } from "../models/dpp.js";
import { UserProblem } from "../models/userproblem.js";
import { getUserStatus } from "./codeforces.api.js";
import axios from "axios";

const CF_PROBLEMSET_URL = "https://codeforces.com/api/problemset.problems";

/**
 * Pick a random problem from Codeforces problemset as the daily problem.
 * Filters by rating range 1000-2000 and ensures variety by rotating tags.
 */
export async function generateDailyProblem() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Check if today's problem already exists
  const existing = await DPP.findOne({ date: today });
  if (existing) return existing;

  // Fetch problemset from CF
  const { data } = await axios.get(CF_PROBLEMSET_URL);
  if (data.status !== "OK") throw new Error("Failed to fetch CF problemset");

  const problems = data.result.problems.filter(
    (p) => p.rating && p.rating >= 1000 && p.rating <= 2000 && p.tags.length > 0
  );

  if (problems.length === 0) throw new Error("No suitable problems found");

  // Pick a random problem
  const pick = problems[Math.floor(Math.random() * problems.length)];

  const difficulty =
    pick.rating <= 1200 ? "easy" : pick.rating <= 1600 ? "medium" : "hard";

  const dpp = await DPP.create({
    date: today,
    problem: {
      contestId: pick.contestId,
      index: pick.index,
      name: pick.name,
      rating: pick.rating,
      tags: pick.tags,
      url: `https://codeforces.com/problemset/problem/${pick.contestId}/${pick.index}`,
    },
    difficulty,
    topic: pick.tags[0] || "general",
    solvers: [],
  });

  return dpp;
}

/**
 * Get today's daily problem.
 */
export async function getTodayProblemService() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let dpp = await DPP.findOne({ date: today });
  if (!dpp) {
    dpp = await generateDailyProblem();
  }

  return dpp;
}

/**
 * Get past daily problems (paginated).
 */
export async function getPastProblemsService(page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const problems = await DPP.find()
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await DPP.countDocuments();

  return {
    problems,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Mark a daily problem as solved by a user.
 */
export async function markSolvedService(userId, dppId) {
  const dpp = await DPP.findById(dppId);
  if (!dpp) throw new Error("Daily problem not found");

  const alreadySolved = dpp.solvers.some(
    (s) => s.user.toString() === userId.toString()
  );

  if (alreadySolved) {
    return { alreadySolved: true, dpp };
  }

  dpp.solvers.push({ user: userId, solvedAt: new Date() });
  await dpp.save();

  return { alreadySolved: false, dpp };
}
