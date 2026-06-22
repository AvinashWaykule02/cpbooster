import { Worker } from "bullmq";
import redisConnection from "../config/redis.js";
import { fetchAndUpdateStats } from "../services/fetch-stats-data.js";

// Workers use blocking Redis commands — give them their own connection
// instead of sharing the one used for regular reads/writes.
const connection = redisConnection.duplicate();

export const friendWorker = new Worker(
  "friend-sync",
  async (job) => {
    const { handle } = job.data;
    console.log(`🔄 [friend-sync] Syncing newly-added friend: ${handle}`);
    await fetchAndUpdateStats(handle);
    console.log(`✅ [friend-sync] Done: ${handle}`);
  },
  { connection, concurrency: 2 }
);

friendWorker.on("failed", (job, err) => {
  console.error(`❌ [friend-sync] Job failed for ${job?.data?.handle}:`, err.message);
});
