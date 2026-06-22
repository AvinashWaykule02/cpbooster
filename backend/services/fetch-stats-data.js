import { getUserStatus, getUserRating } from "./codeforces.api.js";
import { updateUserStats } from "./stats-service.js";

const WINDOW_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Single entry point used by BOTH the friend-worker (on add-friend)
 * and the leaderboard-worker (daily batch sync). Keeping this in one
 * place means "how we sync a handle" only has one implementation.
 */
export async function fetchAndUpdateStats(handle) {
  const [submissions, ratingChanges] = await Promise.all([
    getUserStatus(handle, 1, 10000),
    getUserRating(handle).catch(() => []), // handle may have 0 rated contests — not a failure
  ]);

  const cutoffMs = startOfUtcDay(
    new Date(Date.now() - (WINDOW_DAYS - 1) * MS_PER_DAY)
  ).getTime();
  const recentSubmissions = submissions.filter(
    (s) => s.creationTimeSeconds * 1000 >= cutoffMs
  );

  return updateUserStats(handle, recentSubmissions, ratingChanges);
}
