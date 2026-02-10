/**
 * Rate Limiter Utility
 * Prevents brute force attacks by limiting attempts within a time window
 */

export const createRateLimiter = (maxAttempts = 5, windowMs = 60000) => {
  const attempts = new Map();
  
  return (key) => {
    const now = Date.now();
    const userAttempts = attempts.get(key) || [];
    const recentAttempts = userAttempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      return false;  // Rate limited
    }
    
    recentAttempts.push(now);
    attempts.set(key, recentAttempts);
    return true;  // Allowed
  };
};
