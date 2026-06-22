import cron from "node-cron";
import { Friend } from "../models/friend.js";
import { UserStats } from "../models/leaderboard.js";
import { enqueueLeaderboardBatch } from "../job-queues/leaderboard-queue.js";

const SCHEDULE = "0 12 * * *"; // every day at 12:00 PM server time
const BATCH_SIZE = 50;

export function startLeaderboardCron() {
  cron.schedule(SCHEDULE, runDailyLeaderboardSync);
  console.log(`[LEADERBOARD CRON] Scheduled: "${SCHEDULE}" (daily at 12 PM)`);
}

export async function runDailyLeaderboardSync() {
  const startedAt = Date.now();
  console.log(`[LEADERBOARD CRON] Run started ${new Date(startedAt).toISOString()}`);

  try {
    // every handle anyone has added as a friend...
    const friendHandles = await Friend.distinct("friendHandle");
    // ...plus every handle we already have stats for (covers self-syncs
    // or handles whose last friend-link was removed but data is still cached)
    const trackedHandles = await UserStats.distinct("cfHandle");

    const allHandles = [...new Set([...friendHandles, ...trackedHandles])];

    if (!allHandles.length) {
      console.log("[LEADERBOARD CRON] No handles to sync.");
      return;
    }

    const batches = chunk(allHandles, BATCH_SIZE);
    for (const batch of batches) {
      await enqueueLeaderboardBatch(batch);
    }

    console.log(
      `[LEADERBOARD CRON] Queued ${batches.length} batches covering ${allHandles.length} handles ` +
        `in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`
    );
  } catch (err) {
    console.error("[LEADERBOARD CRON] Failed:", err.message);
  }
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}