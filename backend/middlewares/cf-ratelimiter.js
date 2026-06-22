/**
 * Codeforces enforces ~1 request / 2 seconds per IP.
 * This is a single shared FIFO queue — every CF call in the app
 * (auth, contest, dpp, friends, leaderboard, analytics, admin)
 * should funnel through it so you never hit "Call limit exceeded".
 */
class CFRateLimiter {
  constructor(minIntervalMs = 2100) {
    this.minInterval = minIntervalMs;
    this.queue = [];
    this.lastRequestTime = 0;
    this.processing = false;
  }

  enqueue(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this._process();
    });
  }

  async _process() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const wait = Math.max(0, this.lastRequestTime + this.minInterval - now);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));

      const { fn, resolve, reject } = this.queue.shift();
      this.lastRequestTime = Date.now();

      try {
        resolve(await fn());
      } catch (err) {
        reject(err);
      }
    }

    this.processing = false;
  }

  get pending() {
    return this.queue.length;
  }
}

// Singleton — import this everywhere instead of creating new instances
export default new CFRateLimiter();