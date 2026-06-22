import { Queue } from "bullmq";
import redisConnection from "../config/redis.js";

export const leaderboardQueue = new Queue("leaderboard-sync", { connection: redisConnection });

/**
 * Enqueues one batch (chunk of handles) for the daily sync.
 * Called by controllers/crone/leaderboard-cron.js.
 */
export async function enqueueLeaderboardBatch(handles) {
  return leaderboardQueue.add(
    "sync-batch",
    { handles },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 10000 },
      removeOnComplete: true,
      removeOnFail: 100,
    }
  );
}