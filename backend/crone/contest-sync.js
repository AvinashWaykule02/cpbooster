import cron from "node-cron";
import User from "../models/user.js";
import { syncUserContests } from "../services/contest-service.js";

const SCHEDULE = "30 */6 * * *"; // every 6 hours at :30

export function startContestSyncCron() {
  cron.schedule(SCHEDULE, async () => {
    console.log("[CONTEST CRON] Starting contest sync...");
    try {
      const users = await User.find({}, "codeforcesHandle").lean();

      for (const user of users) {
        try {
          await syncUserContests(user._id, user.codeforcesHandle);
        } catch (err) {
          console.error(`[CONTEST CRON] Failed for ${user.codeforcesHandle}:`, err.message);
        }
      }

      console.log(`[CONTEST CRON] Synced contests for ${users.length} users`);
    } catch (err) {
      console.error("[CONTEST CRON] Fatal error:", err.message);
    }
  });

  console.log(`[CONTEST CRON] Scheduled: "${SCHEDULE}"`);
}
