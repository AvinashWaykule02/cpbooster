import Contest from "../models/contest.js";
import PastContest from "../models/past-contest.js";
import User from "../models/user.js";
import { getUserRating, getContestList } from "./codeforces.api.js";

/**
 * Sync contest history for a single user from Codeforces API.
 * Fetches rating changes, upserts Contest docs, and upserts
 * ContestParticipation records.
 */
export async function syncUserContests(userId, cfHandle) {
  const ratingChanges = await getUserRating(cfHandle).catch(() => []);
  if (!ratingChanges || ratingChanges.length === 0) return 0;

  let synced = 0;

  for (const rc of ratingChanges) {
    // Upsert the contest itself
    await Contest.findOneAndUpdate(
      { contestId: rc.contestId },
      {
        $set: {
          name: rc.contestName,
          startTime: new Date(rc.ratingUpdateTimeSeconds * 1000),
          status: "FINISHED",
        },
      },
      { upsert: true, new: true }
    );

    // Upsert participation
    await PastContest.findOneAndUpdate(
      { userId: userId, contestId: rc.contestId },
      {
        $set: {
          handle: cfHandle,
          contestName: rc.contestName,
          rank: rc.rank,
          oldRating: rc.oldRating,
          newRating: rc.newRating,
          ratingChange: rc.newRating - rc.oldRating,
        },
      },
      { upsert: true, new: true }
    );

    synced++;
  }

  return synced;
}

/**
 * Get upcoming contests from Codeforces.
 * Filters contest list to only BEFORE phase (upcoming).
 */
export async function getUpcomingContestsService() {
  const contests = await getContestList(false);
  return contests
    .filter((c) => c.phase === "BEFORE")
    .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)
    .slice(0, 20)
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      phase: c.phase,
      startTime: new Date(c.startTimeSeconds * 1000),
      durationMinutes: Math.round(c.durationSeconds / 60),
      url: `https://codeforces.com/contest/${c.id}`,
    }));
}

/**
 * Get a user's contest history from MongoDB.
 */
export async function getUserContestHistoryService(userId) {
  const participations = await PastContest.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: "contests",
        localField: "contestId",
        foreignField: "contestId",
        as: "contestInfo",
      },
    },
    { $unwind: { path: "$contestInfo", preserveNullAndEmptyArrays: true } },
    { $sort: { "contestInfo.startTime": -1, createdAt: -1 } },
  ]);

  return participations.map((p) => ({
    contestName: p.contestName || "Unknown",
    date: p.contestInfo?.startTime,
    rank: p.rank,
    oldRating: p.oldRating,
    newRating: p.newRating,
    ratingChange: p.ratingChange,
  }));
}
