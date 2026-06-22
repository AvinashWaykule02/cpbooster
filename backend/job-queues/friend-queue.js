import { Queue } from "bullmq";
import redisConnection from "../config/redis.js";

export const friendQueue = new Queue("friend-sync", { connection: redisConnection });

/**
 * Call this right after a friend is added so their stats populate
 * without the user waiting on a live Codeforces round-trip.
 */
export async function enqueueFriendSync(handle) {
  return friendQueue.add(
    "sync-handle",
    { handle },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true,
      removeOnFail: 50,
    }
  );
}