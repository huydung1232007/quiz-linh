// api/dashboard.js — trả danh sách nhiều lượt thi và chi tiết mới nhất.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return res.status(500).json({ ok: false, error: 'Dashboard storage is not configured' });

  try {
    const base = url.replace(/\/$/, '');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    async function redis(commands) {
      const r = await fetch(`${base}/pipeline`, { method: 'POST', headers, body: JSON.stringify(commands) });
      if (!r.ok) throw new Error('Storage request failed');
      const out = await r.json();
      if (Array.isArray(out) && out.some(x => x.error)) throw new Error('Redis command failed');
      return out;
    }
    const idsResult = await redis([['ZREVRANGE', 'quizmaster:live:sessions', '0', '49']]);
    const ids = idsResult?.[0]?.result || [];
    const commands = [
      ['GET', 'quizmaster:live:latest'],
      ...ids.map(id => ['GET', `quizmaster:live:session:${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}`])
    ];
    const values = await redis(commands);
    const latestRaw = values?.[0]?.result;
    const sessions = values.slice(1).map(x => {
      try { return x?.result ? JSON.parse(x.result) : null; } catch { return null; }
    }).filter(Boolean).sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    let latest = null;
    try { latest = latestRaw ? JSON.parse(latestRaw) : null; } catch {}
    // Compat: nếu có dữ liệu cũ trước khi bật multi-session, vẫn hiển thị nó.
    if (!sessions.length && latest) sessions.push(latest);
    return res.status(200).json({ ok: true, data: sessions[0] || latest || null, sessions });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Unable to load dashboard' });
  }
}
