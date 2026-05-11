const WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const attemptsByKey = new Map();

const cleanText = (value, limit) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, limit);
};

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

export async function handleChat(req, res) {
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
      error: 'Too many requests',
      retryAfter: limiterResult.retryAfter,
    });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server is missing Gemini API configuration' });
    return;
  }

  const payload = typeof req.body === 'string'
    ? (() => {
        try {
          return JSON.parse(req.body);
        } catch {
          return {};
        }
      })()
    : (req.body || {});

  const input = cleanText(payload.input, 4000);
  const systemPrompt = cleanText(payload.systemPrompt, 4000);

  if (!input) {
    res.status(400).json({ error: 'Input is required' });
    return;
  }

  const prompt = [
    systemPrompt || 'You are a helpful assistant.',
    '',
    `User message: ${input}`,
  ].join('\n');

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      const message = data?.error?.message || 'Gemini request failed';
      res.status(upstream.status).json({ error: message });
      return;
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || '')
      .join('')
      .trim() || 'No response from assistant.';

    res.status(200).json({ text });
  } catch (error) {
    res.status(500).json({ error: 'Failed to contact Gemini' });
  }
}
