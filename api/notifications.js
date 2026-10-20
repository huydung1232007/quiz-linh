
 // api/notifications.js — thông báo riêng cho một lượt thi + xác nhận đã đọc.
export default async function handler(req, res) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return res.status(500).json({
      ok: false,
      error: "Thiếu biến môi trường Upstash Redis."
    });
  }

  const redisBase = redisUrl.replace(/\/$/, "");
  const headers = {
    Authorization: `Bearer ${redisToken}`,
    "Content-Type": "application/json"
  };

  async function redis(commands) {
    const response = await fetch(`${redisBase}/pipeline`, {
      method: "POST",
      headers,
      body: JSON.stringify(commands)
    });

    if (!response.ok) {
      throw new Error(`Redis HTTP ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data) && data.some(item => item.error)) {
      throw new Error("Redis command failed");
    }

    return data;
  }

  const clean = (value, max = 200) =>
    String(value ?? "").slice(0, max);

  const safeId = value =>
    clean(value, 120).replace(/[^a-zA-Z0-9_-]/g, "_");

  try {
    // THÍ SINH: lấy thông báo
    if (req.method === "GET") {
      const action = clean(req.query?.action, 20);

      if (action === "poll") {
        const sessionId = safeId(req.query?.sessionId);

        if (!sessionId) {
          return res.status(400).json({
            ok: false,
            error: "Thiếu sessionId."
          });
        }

        const idsResult = await redis([
          [
            "ZREVRANGE",
            `quizmaster:notifications:session:${sessionId}`,
            "0",
            "19"
          ]
        ]);

        const ids = idsResult?.[0]?.result || [];

        if (!ids.length) {
          return res.status(200).json({
            ok: true,
            notifications: []
          });
        }

        const records = await redis(
          ids.map(id => [
            "GET",
            `quizmaster:notifications:item:${safeId(id)}`
          ])
        );

        const notifications = records
          .map(record => {
            if (!record?.result) return null;

            try {
              return JSON.parse(record.result);
            } catch {
              return null;
            }
          })
          .filter(Boolean);

        return res.status(200).json({
          ok: true,
          notifications
        });
      }

      // DASHBOARD: kiểm tra số lượt đã xác nhận
      if (action === "status") {
        const notificationId = safeId(
          req.query?.notificationId
        );

        if (!notificationId) {
          return res.status(400).json({
            ok: false,
            error: "Thiếu notificationId."
          });
        }

        const result = await redis([
          [
            "SMEMBERS",
            `quizmaster:notifications:ack:${notificationId}`
          ]
        ]);

        return res.status(200).json({
          ok: true,
          acknowledgedBy: result?.[0]?.result || []
        });
      }

      return res.status(400).json({
        ok: false,
        error: "Action không hợp lệ."
      });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");

      return res.status(405).json({
        ok: false,
        error: "Method not allowed"
      });
    }

    const input = req.body || {};
    const action = clean(input.action, 20);

    // DASHBOARD: gửi thông báo cho một thí sinh
    if (action === "send") {
      const expectedKey = process.env.DASHBOARD_NOTIFY_KEY;

      if (!expectedKey) {
        return res.status(503).json({
          ok: false,
          error: "Hãy thêm DASHBOARD_NOTIFY_KEY trong Vercel Environment Variables."
        });
      }

      if (
        typeof input.notifyKey !== "string" ||
        input.notifyKey !== expectedKey
      ) {
        return res.status(401).json({
          ok: false,
          error: "Khóa bảo vệ không đúng."
        });
      }

      const sessionId = safeId(input.sessionId);
      const message = clean(input.message, 1200).trim();

      if (!sessionId || !message) {
        return res.status(400).json({
          ok: false,
          error: "Thiếu thí sinh hoặc nội dung."
        });
      }

      // Kiểm tra lượt thi có tồn tại trong Redis
      const sessionResult = await redis([
        ["GET", `quizmaster:live:session:${sessionId}`]
      ]);

      if (!sessionResult?.[0]?.result) {
        return res.status(404).json({
          ok: false,
          error: "Không tìm thấy lượt thi này; có thể dữ liệu theo dõi đã hết hạn."
        });
      }

      const id =
        `n-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      const notification = {
        id,
        sessionId,
        message,
        createdAt: new Date().toISOString(),
        playerName: (() => {
          try {
            return (
              JSON.parse(sessionResult[0].result).playerName ||
              "Thí sinh"
            );
          } catch {
            return "Thí sinh";
          }
        })()
      };

      await redis([
        [
          "SET",
          `quizmaster:notifications:item:${id}`,
          JSON.stringify(notification),
          "EX",
          604800
        ],
        [
          "ZADD",
          `quizmaster:notifications:session:${sessionId}`,
          String(Date.now()),
          id
        ],
        [
          "EXPIRE",
          `quizmaster:notifications:session:${sessionId}`,
          "604800"
        ]
      ]);

      return res.status(200).json({
        ok: true,
        notification
      });
    }

    // THÍ SINH: xác nhận đã đọc thông báo
    if (action === "ack") {
      const sessionId = safeId(input.sessionId);
      const notificationId = safeId(input.notificationId);

      if (!sessionId || !notificationId) {
        return res.status(400).json({
          ok: false,
          error: "Thiếu mã thông báo hoặc lượt thi."
        });
      }

      const itemResult = await redis([
        [
          "GET",
          `quizmaster:notifications:item:${notificationId}`
        ]
      ]);

      if (!itemResult?.[0]?.result) {
        return res.status(404).json({
          ok: false,
          error: "Thông báo đã hết hạn hoặc không tồn tại."
        });
      }

      let item;

      try {
        item = JSON.parse(itemResult[0].result);
      } catch {
        item = null;
      }

      if (!item || item.sessionId !== sessionId) {
        return res.status(403).json({
          ok: false,
          error: "Thông báo không thuộc lượt thi này."
        });
      }

      await redis([
        [
          "SADD",
          `quizmaster:notifications:ack:${notificationId}`,
          sessionId
        ],
        [
          "EXPIRE",
          `quizmaster:notifications:ack:${notificationId}`,
          "604800"
        ]
      ]);

      return res.status(200).json({
        ok: true,
        acknowledged: true
      });
    }

    return res.status(400).json({
      ok: false,
      error: "Action không hợp lệ."
    });
  } catch (err) {
    console.error("[notifications.js]", err);

    return res.status(502).json({
      ok: false,
      error: "Notification backend failed."
    });
  }
}
