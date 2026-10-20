export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return res.status(500).json({ ok: false, error: 'Missing Redis Config' });

  try {
    const base = url.replace(/\/+$/, "");
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    
    // Hàm gọi Redis an toàn, không dùng pipeline để tránh lỗi Vercel
    async function redis(command) {
      const r = await fetch(base, { method: "POST", headers, body: JSON.stringify(command) });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      return data.result;
    }

    // Lấy danh sách ID các thí sinh đang thi từ key v2
    const ids = await redis(["SMEMBERS", "quizmaster:live:sessions:v2"]) || [];
    
    // Lấy dữ liệu hoạt động gần nhất
    const latestRaw = await redis(["GET", "quizmaster:live:latest"]);
    let latest = null;
    try { if (latestRaw) latest = JSON.parse(latestRaw); } catch(e){}

    // Lấy chi tiết từng lượt thi
    const sessions = [];
    for (const id of ids) {
        const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
        const raw = await redis(["GET", `quizmaster:live:session:${safeId}`]);
        if (raw) {
            try { sessions.push(JSON.parse(raw)); } catch(e){}
        }
    }
    
    // Sắp xếp người mới thao tác lên đầu
    sessions.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    if (!sessions.length && latest) sessions.push(latest);

    return res.status(200).json({ ok: true, data: sessions[0] || latest || null, sessions });
  } catch (err) {
    console.error("[api/dashboard.js]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
