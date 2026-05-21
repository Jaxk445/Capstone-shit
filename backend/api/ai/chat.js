const WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const ANTHROPIC_MODEL = 'claude-opus-4-6';
const ANTHROPIC_VERSION = '2023-06-01';

const attemptsByKey = new Map();

const cleanText = (value, limit) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, limit);
};

const normalizeMessages = (messages) => {
  if (!Array.isArray(messages)) return [];

  return messages
    .map((message) => {
      const role = message?.role === 'assistant' ? 'assistant' : 'user';
      const rawContent = typeof message?.content === 'string'
        ? message.content
        : typeof message?.text === 'string'
          ? message.text
          : '';
      const content = cleanText(rawContent, 4000);

      if (!content) return null;

      return {
        role,
        content: [{ type: 'text', text: content }],
      };
    })
    .filter(Boolean);
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

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server is missing Anthropic API configuration' });
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
  const messages = normalizeMessages(payload.messages);

  if (!input && messages.length === 0) {
    res.status(400).json({ error: 'Input is required' });
    return;
  }

  const conversation = messages.length > 0
    ? messages
    : [{ role: 'user', content: [{ type: 'text', text: input }] }];

  try {
    const upstream = await fetch(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 1024,
          system: systemPrompt || 'You are a helpful assistant.',
          messages: conversation,
        }),
      }
    );

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      const message = data?.error?.message || data?.error?.type || 'Anthropic request failed';
      res.status(upstream.status).json({ error: message });
      return;
    }

    const text = data?.content
      ?.map((part) => part?.text || '')
      .join('')
      .trim() || 'No response from assistant.';

    res.status(200).json({ text });
  } catch (error) {
    res.status(500).json({ error: 'Failed to contact Anthropic' });
  }
}

export default async function handler(req, res) {
  return handleChat(req, res);
}
