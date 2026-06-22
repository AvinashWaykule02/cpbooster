import { Worker } from "bullmq";
import redisConnection from "../config/redis.js";
import { fetchAndUpdateStats } from "../services/fetch-stats-data.js";

const connection = redisConnection.duplicate();

export const leaderboardWorker = new Worker(
  "leaderboard-sync",
  async (job) => {
    const { handles } = job.data;
    console.log(`🔄 [leaderboard-sync] Batch of ${handles.length} handles`);

    // Promise.allSettled so one bad handle doesn't fail the whole batch —
    // actual CF call pacing is still enforced by the shared rate limiter
    // inside codeforces.api.js, so this doesn't flood Codeforces.
    const results = await Promise.allSettled(handles.map((h) => fetchAndUpdateStats(h)));

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length) {
      console.error(`⚠️ [leaderboard-sync] ${failed.length}/${handles.length} handles failed`);
    }
  },
  { connection, concurrency: 1 } // one batch job at a time is enough — the rate limiter is the real bottleneck
);

leaderboardWorker.on("failed", (job, err) => {
  console.error("❌ [leaderboard-sync] Batch failed:", err.message);
});
