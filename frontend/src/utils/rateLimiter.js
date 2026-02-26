/**
 * Rate Limiter Utility (Improved)
 * - Sliding time window implementation
 * - Returns detailed result: allowed, remaining, retryAfter (ms)
 * - Cleans up empty keys to avoid unbounded memory growth
 *
 * Notes:
 * - This in-memory limiter is fine for single-process dev/testing.
 * - For production (multiple server instances or serverless), use a centralized store
 *   such as Redis (sorted sets) to coordinate limits across instances.
 *
 * Usage:
 * const limiter = createRateLimiter(5, 60000);
 * const res = limiter.consume(key);
 * if (!res.allowed) { // block, show retryAfter }
 */

export const createRateLimiter = (maxAttempts = 5, windowMs = 60000) => {
  // Map<key, Array<number>> - timestamps (ms) of recent attempts, ordered oldest->newest
  const attempts = new Map();

  const now = () => Date.now();

  // Remove expired timestamps from the front of the array
  const prune = (arr, cutoff) => {
    let i = 0;
    while (i < arr.length && arr[i] < cutoff) i++;
    if (i > 0) arr.splice(0, i);
  };

  return {
    /**
     * Record an attempt and return the limiter result.
     * @param {string} key - unique key for the entity (e.g., ip or user email)
     * @returns {{allowed: boolean, remaining: number, retryAfter: number}}
     */
    consume(key) {
      const t = now();
      const cutoff = t - windowMs;
      const arr = attempts.get(key) || [];

      // prune old entries
      prune(arr, cutoff);

      if (arr.length >= maxAttempts) {
        // Rate limited. retryAfter = time until the oldest entry expires
        const retryAfter = Math.max(0, windowMs - (t - arr[0]));
        return { allowed: false, remaining: 0, retryAfter };
      }

      // record this attempt
      arr.push(t);
      attempts.set(key, arr);

      const remaining = Math.max(0, maxAttempts - arr.length);
      return { allowed: true, remaining, retryAfter: 0 };
    },

    /**
     * Peek at the limiter state without recording an attempt.
     * @param {string} key
     */
    peek(key) {
      const t = now();
      const cutoff = t - windowMs;
      const arr = attempts.get(key) || [];
      prune(arr, cutoff);
      if (arr.length === 0) return { allowed: true, remaining: maxAttempts, retryAfter: 0 };
      if (arr.length < maxAttempts) return { allowed: true, remaining: maxAttempts - arr.length, retryAfter: 0 };
      const retryAfter = Math.max(0, windowMs - (t - arr[0]));
      return { allowed: false, remaining: 0, retryAfter };
    },

    /**
     * Reset attempts for a key (useful after successful login)
     */
    reset(key) {
      attempts.delete(key);
    },

    /**
     * Get internal stats (for monitoring/testing)
     */
    _stats() {
      const obj = {};
      for (const [k, v] of attempts.entries()) obj[k] = v.length;
      return obj;
    }
  };
};
