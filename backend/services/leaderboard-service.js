import { Friend } from "../models/friend.js";
import redisConnection from "../config/redis.js";

const LEADERBOARD_ZSET = "leaderboard:30d";

export async function addFriendService(userId, friendHandle) {
  return Friend.create({ userId, friendHandle: friendHandle.trim() });
}

export async function removeFriendService(userId, friendHandle) {
  return Friend.findOneAndDelete({ userId, friendHandle: friendHandle.trim() });
}

export async function listFriendsService(userId) {
  const friends = await Friend.find({ userId }).select("friendHandle createdAt");
  return friends.map((f) => ({ handle: f.friendHandle, addedAt: f.createdAt }));
}

/**
 * Builds the ranked leaderboard for one user's friend list purely from
 * Redis (zscore for rank, hgetall for the stat breakdown). No CF call,
 * no Mongo aggregation — this is the "live" read path.
 */
export async function getFriendsLeaderboardService(userId) {
  const friends = await Friend.find({ userId }).select("friendHandle");
  const handles = friends.map((f) => f.friendHandle);
  if (!handles.length) return [];

  const pipeline = redisConnection.pipeline();
  handles.forEach((handle) => {
    pipeline.zscore(LEADERBOARD_ZSET, handle);
    pipeline.hgetall(`user:${handle}:30d`);
  });

  const results = await pipeline.exec(); // [[err, result], [err, result], ...]

  const leaderboard = handles.map((handle, i) => {
    const [scoreErr, score] = results[i * 2];
    const [statsErr, stats] = results[i * 2 + 1];

    // not synced yet (e.g. just added, background job still in queue)
    if (scoreErr || statsErr || score === null) {
      return {
        handle,
        score: 0,
        solved: 0,
        ratingGain: 0,
        contests: 0,
        activeDays: 0,
        avgRating: 0,
        syncing: true,
      };
    }

    return {
      handle,
      score: Number(score),
      solved: Number(stats?.solved || 0),
      ratingGain: Number(stats?.ratingGain || 0),
      contests: Number(stats?.contests || 0),
      activeDays: Number(stats?.activeDays || 0),
      avgRating: Number(stats?.avgRating || 0),
      syncing: false,
    };
  });

  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard.forEach((u, i) => {
    u.rank = i + 1;
  });

  return leaderboard;
}