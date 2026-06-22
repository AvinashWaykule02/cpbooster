import { UserStats } from "../models/leaderboard.js";
import redisConnection from "../config/redis.js";

const WINDOW_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LEADERBOARD_ZSET = "leaderboard:30d";

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function groupByDay(submissions) {
  const map = new Map();
  submissions.forEach((sub) => {
    const date = new Date(sub.creationTimeSeconds * 1000).toISOString().slice(0, 10);
    if (!map.has(date)) map.set(date, []);
    map.get(date).push(sub);
  });
  return map;
}

function computeDayStats(subs) {
  const acceptedSubs = subs.filter((s) => s.verdict === "OK");

  // contestId+index is a more reliable unique key than problem name
  // (different problems across contests can share a name)
  const uniqueProblems = new Set(
    acceptedSubs.map((s) =>
      s.problem?.contestId ? `${s.problem.contestId}${s.problem.index}` : s.problem?.name
    )
  );

  const ratings = acceptedSubs.map((s) => s.problem?.rating).filter(Boolean);
  const avgProblemRating = ratings.length
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 0;

  const contests = new Set();
  acceptedSubs.forEach((s) => {
    if (s.contestId) contests.add(s.contestId);
  });

  return {
    problemsSolved: uniqueProblems.size,
    contestsGiven: contests.size,
    avgProblemRating,
    activeDays: uniqueProblems.size > 0 ? 1 : 0,
  };
}

/**
 * Recomputes a handle's daily stats from a fresh batch of submissions, then
 * refreshes the cached 30-day Redis entry + leaderboard score.
 *
 * IMPORTANT: each day present in `submissions` is REPLACED, not merged.
 * The original draft incremented existing values, which double-counted
 * every time the cron or a retry re-ran for the same day. Since we always
 * fetch the full recent submission history, replacing is the correct,
 * idempotent behavior — re-running this 10 times produces the same result.
 */
export async function updateUserStats(handle, submissions = [], ratingChanges = []) {
  try {
    let user = await UserStats.findOne({ cfHandle: handle });
    if (!user) {
      user = await UserStats.create({ cfHandle: handle, dailyStats: [] });
    }

    const now = new Date();
    const windowStart = startOfUtcDay(new Date(now.getTime() - (WINDOW_DAYS - 1) * MS_PER_DAY));
    const grouped = groupByDay(
      submissions.filter((s) => s.creationTimeSeconds * 1000 >= windowStart.getTime())
    );

    for (const [date, subs] of grouped.entries()) {
      const computed = computeDayStats(subs);
      const existing = user.dailyStats.find(
        (d) => d.date.toISOString().slice(0, 10) === date
      );

      if (existing) {
        Object.assign(existing, computed);
      } else {
        user.dailyStats.push({ date: new Date(date), ratingChange: 0, ...computed });
      }
    }

    user.dailyStats = user.dailyStats
      .filter((d) => d.date.getTime() >= windowStart.getTime())
      .sort((a, b) => a.date - b.date);

    // ---- rating gained in the last 30 days (from passed-in rating changes) ----
    const totalRatingGain = ratingChanges
      .filter((r) => r.ratingUpdateTimeSeconds * 1000 >= windowStart.getTime())
      .reduce((sum, r) => sum + (r.newRating - r.oldRating), 0);

    // ---- true rolling 30-day rollup from dailyStats ----
    const windowStats = user.dailyStats.filter((d) => d.date.getTime() >= windowStart.getTime());
    const totalSolved = windowStats.reduce((a, b) => a + (b.problemsSolved || 0), 0);
    const totalContests = windowStats.reduce((a, b) => a + (b.contestsGiven || 0), 0);
    const activeDays = windowStats.reduce((a, b) => a + (b.activeDays || 0), 0);
    const ratedDays = windowStats.filter((d) => d.avgProblemRating > 0);
    const avgRating = ratedDays.length
      ? ratedDays.reduce((a, b) => a + b.avgProblemRating, 0) / ratedDays.length
      : 0;

    const score =
      totalRatingGain * 3 +
      totalSolved * 2 +
      totalContests * 5 +
      activeDays * 1.5 +
      avgRating / 100;

    user.leaderboard30d = {
      solved: totalSolved,
      ratingGain: totalRatingGain,
      contests: totalContests,
      activeDays,
      avgRating,
      score,
      windowStart,
      windowEnd: now,
      syncedAt: now,
    };

    await user.save();

    await redisConnection.hset(`user:${handle}:30d`, {
      solved: totalSolved,
      ratingGain: totalRatingGain,
      contests: totalContests,
      activeDays,
      avgRating,
      score,
      windowStart: windowStart.toISOString(),
      windowEnd: now.toISOString(),
    });

    await redisConnection.zadd(LEADERBOARD_ZSET, score, handle);

    console.log(
      `✅ Synced ${handle} — solved:${totalSolved} ratingGain:${totalRatingGain} score:${score.toFixed(2)}`
    );

    return { handle, totalSolved, totalRatingGain, totalContests, activeDays, avgRating, score };
  } catch (err) {
    console.error(`❌ updateUserStats failed for ${handle}:`, err.message);
    throw err; // let BullMQ see the failure so it retries
  }
}
