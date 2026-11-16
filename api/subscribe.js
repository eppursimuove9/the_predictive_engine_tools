// Vercel serverless function: POST /api/subscribe  { email }
//
// Required environment variables (Vercel > Project > Settings > Environment Variables):
//   BEEHIIV_API_KEY         API key from Beehiiv (Settings > Integrations > API)
//   BEEHIIV_PUBLICATION_ID  looks like pub_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
// Never put these in client code. After adding them, redeploy.

// Very small per-instance rate limit (best effort; serverless instances do not share memory).
const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { BEEHIIV_API_KEY, BEEHIIV_PUBLICATION_ID } = process.env;
  if (!BEEHIIV_API_KEY || !BEEHIIV_PUBLICATION_ID) {
    console.error('Missing BEEHIIV_API_KEY or BEEHIIV_PUBLICATION_ID');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return res.status(429).json({ error: 'Too many requests' });

  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(
      `https://api.beehiiv.com/v2/publications/${encodeURIComponent(BEEHIIV_PUBLICATION_ID)}/subscriptions`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${BEEHIIV_API_KEY}`,
        },
        body: JSON.stringify({
          email,
          reactivate_existing: false, // do not re-subscribe people who unsubscribed
          send_welcome_email: true,
          utm_source: 'roi-calculator',
          utm_medium: 'tool',
          tier: 'free',
        }),
      }
    );
    if (!r.ok) {
      console.error('Beehiiv error', r.status, (await r.text()).slice(0, 500));
      return res.status(502).json({ error: 'Subscription failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Subscribe error', err && err.name);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    clearTimeout(timer);
  }
}
