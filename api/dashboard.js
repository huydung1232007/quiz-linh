```javascript
// api/dashboard.js
// Lấy danh sách nhiều lượt thi và chi tiết lượt thi mới nhất.

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");

    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return res.status(500).json({
      ok: false,
      error: "Dashboard storage is not configured"
    });
  }

  const base = redisUrl.replace(/\/+$/, "");

  const headers = {
    Authorization: `Bearer ${redisToken}`,
    "Content-Type": "application/json"
  };

  // Chạy từng lệnh để xác định chính xác lỗi Redis.
  async function redis(command) {
    const response = await fetch(base, {
      method: "POST",
      headers,
      body: JSON.stringify(command)
    });

    const raw = await response.text();
    let result;

    try {
      result = JSON.parse(raw);
    } catch {
      throw new Error(`Redis ${command[0]}: invalid response`);
    }

    if (!response.ok || result.error) {
      const detail =
        typeof result.error === "string"
          ? result.error
          : JSON.stringify(result.error || result);

      throw new Error(`Redis ${command[0]}: ${detail}`);
    }

    return result.result;
  }

  function parseSession(raw) {
    if (!raw || typeof raw !== "string") return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  try {
    // Đọc danh sách session theo đúng key và kiểu Set trong track.js.
    const ids = await redis([
      "SMEMBERS",
      "quizmaster:live:sessions:v2"
    ]);

    const sessionIds = Array.isArray(ids)
      ? ids.slice(0, 100)
      : [];

    // Lấy dữ liệu chi tiết của từng lượt thi.
    const sessionResults = await Promise.all(
      sessionIds.map(async (id) => {
        const safeId = String(id);

        // Không tự sửa sessionId vì key phải khớp với track.js.
        const raw = await redis([
          "GET",
          `quizmaster:live:session:${safeId}`
        ]);

        return parseSession(raw);
      })
    );

    let sessions = sessionResults.filter(Boolean);

    // Lấy dữ liệu mới nhất để tương thích với dashboard cũ.
    const latestRaw = await redis([
      "GET",
      "quizmaster:live:latest"
    ]);

    const latest = parseSession(latestRaw);

    // Sắp xếp lượt thi mới cập nhật lên đầu.
    sessions.sort((a, b) => {
      const timeA = Date.parse(a.updatedAt || "") || 0;
      const timeB = Date.parse(b.updatedAt || "") || 0;

      return timeB - timeA;
    });

    // Nếu chưa có session riêng, vẫn hiển thị dữ liệu mới nhất.
    if (sessions.length === 0 && latest) {
      sessions = [latest];
    }

    // Nếu latest là session mới hơn nhưng chưa nằm trong danh sách,
    // thêm nó vào để dashboard không bỏ sót lượt thi.
    if (latest?.sessionId) {
      const exists = sessions.some(
        (session) => session.sessionId === latest.sessionId
      );

      if (!exists) {
        sessions.push(latest);

        sessions.sort((a, b) => {
          const timeA = Date.parse(a.updatedAt || "") || 0;
          const timeB = Date.parse(b.updatedAt || "") || 0;

          return timeB - timeA;
        });
      }
    }

    return res.status(200).json({
      ok: true,
      data: sessions[0] || latest || null,
      sessions
    });
  } catch (error) {
    console.error("[api/dashboard.js]", error.message);

    return res.status(500).json({
      ok: false,
      error: "Unable to load dashboard",
      detail: error.message
    });
  }
};
```
