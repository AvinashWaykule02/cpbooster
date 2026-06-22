import cron from "node-cron";
import { generateDailyProblem } from "../services/dpp-service.js";

const SCHEDULE = "0 0 * * *"; // midnight UTC every day

export function startDppSyncCron() {
  cron.schedule(SCHEDULE, async () => {
    console.log("[DPP CRON] Generating daily problem...");
    try {
      const dpp = await generateDailyProblem();
      console.log(`[DPP CRON] Today's problem: ${dpp.problem.name} (${dpp.difficulty})`);
    } catch (err) {
      console.error("[DPP CRON] Failed:", err.message);
    }
  });

  console.log(`[DPP CRON] Scheduled: "${SCHEDULE}" (daily at midnight UTC)`);
}
