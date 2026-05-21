import { createClient } from '@supabase/supabase-js';

const WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const attemptsByKey = new Map();

const getClientKey = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  const ip = req.socket?.remoteAddress || req.headers['x-real-ip'];
  return typeof ip === 'string' && ip.trim() ? ip.trim() : 'unknown';
};

const pruneAttempts = (attempts, cutoff) => {
  let index = 0;
  while (index < attempts.length && attempts[index] < cutoff) index += 1;
  if (index > 0) attempts.splice(0, index);
};

const rateLimit = (key) => {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const attempts = attemptsByKey.get(key) || [];

  pruneAttempts(attempts, cutoff);

  if (attempts.length >= MAX_ATTEMPTS) {
    const retryAfter = Math.max(0, WINDOW_MS - (now - attempts[0]));
    attemptsByKey.set(key, attempts);
    return { allowed: false, retryAfter };
  }

  attempts.push(now);
  attemptsByKey.set(key, attempts);
  return { allowed: true, retryAfter: 0 };
};

const cleanText = (value, limit) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, limit);
};

export async function handleSignup(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const key = getClientKey(req);
  const limiterResult = rateLimit(key);
  if (!limiterResult.allowed) {
    res.status(429).json({
      error: 'Too many signup attempts. Please try again later.',
      retryAfter: limiterResult.retryAfter,
    });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({ error: 'Server is missing Supabase configuration' });
    return;
  }

  const payload = typeof req.body === 'string'
    ? (() => {
        try { return JSON.parse(req.body); } catch { return {}; }
      })()
    : (req.body || {});

  const email = cleanText(payload.email, 254).toLowerCase();
  const password = cleanText(payload.password, 500);
  const name = cleanText(payload.name, 200);
  const initials = cleanText(payload.initials, 4).toUpperCase();

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      res.status(400).json({ error: error.message || 'Signup failed' });
      return;
    }

    res.status(200).json({ user: data?.user || null, session: data?.session || null });
  } catch (err) {
    res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
}
