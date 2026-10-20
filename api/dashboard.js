// api/dashboard.js — trả tiến độ mới nhất cho dashboard web.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return res.status(500).json({ ok: false, error: 'Dashboard storage is not configured' });
  }
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([['GET', 'quizmaster:live:latest']])
    });
    if (!response.ok) return res.status(502).json({ ok: false, error: 'Storage request failed' });
    const result = await response.json();
    const value = result?.[0]?.result;
    return res.status(200).json({ ok: true, data: value ? JSON.parse(value) : null });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Unable to load dashboard' });
  }
}
