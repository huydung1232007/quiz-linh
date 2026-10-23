
 // api/notifications.js — thông báo riêng cho một lượt thi + xác nhận đã đọc.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
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

      if (action === 'inbox') {
        const idsResult = await redis([['ZREVRANGE', 'quizmaster:notifications:replies', 0, 499]]);
        const ids = idsResult[0]?.result || [];
        const records = ids.length ? await redis(ids.map(id => ['GET', `quizmaster:notifications:item:${safeId(id)}`])) : [];
        const latest = {};
        for (const record of records) {
          try { const item = JSON.parse(record.result); if (item && !latest[item.sessionId]) latest[item.sessionId] = {id:item.id,createdAt:item.createdAt}; } catch {}
        }
        return res.status(200).json({ok:true,latest});
      }

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
            "99"
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
    if (action === "send" || action === "reply") {
      const isReply = action === 'reply';
      const expectedKey = process.env.DASHBOARD_NOTIFY_KEY;

      if (!isReply && !expectedKey) {
        return res.status(503).json({
          ok: false,
          error: "Hãy thêm DASHBOARD_NOTIFY_KEY trong Vercel Environment Variables."
        });
      }

      if (
        !isReply && (typeof input.notifyKey !== "string" ||
        input.notifyKey !== expectedKey)
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

      if (isReply) {
        const parent = await redis([["GET", `quizmaster:notifications:item:${safeId(input.replyTo)}`]]);
        let teacher;
        try { teacher = JSON.parse(parent[0]?.result || 'null'); } catch {}
        if (!teacher || teacher.sessionId !== sessionId || teacher.sender === 'student') {
          return res.status(403).json({ok:false,error:'Chỉ có thể trả lời tin nhắn giáo viên trong lượt thi này.'});
        }
        const limit = await redis([["SET", `quizmaster:notifications:limit:${sessionId}`, '1', 'EX', 2, 'NX']]);
        if (!limit[0]?.result) return res.status(429).json({ok:false,error:'Vui lòng chờ 2 giây trước khi gửi tiếp.'});
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
        sender: isReply ? 'student' : 'teacher',
        replyTo: isReply ? safeId(input.replyTo) : null,
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

      const script=`
        if redis.call('EXISTS', KEYS[1])==1 or redis.call('EXISTS', KEYS[2])==0 then return 0 end
        redis.call('SET', KEYS[3], ARGV[1], 'EX',604800)
        redis.call('ZADD', KEYS[4], ARGV[2], ARGV[3])
        redis.call('EXPIRE', KEYS[4],604800)
        if ARGV[4]=='student' then
          redis.call('ZADD', KEYS[5], ARGV[2], ARGV[3])
          redis.call('ZREMRANGEBYRANK', KEYS[5],0,-501)
          redis.call('EXPIRE', KEYS[5],604800)
        end
        return 1`;
      const saved=await redis([['EVAL',script,5,
        'quizmaster:deleted:session:'+sessionId,'quizmaster:live:session:'+sessionId,
        'quizmaster:notifications:item:'+id,'quizmaster:notifications:session:'+sessionId,
        'quizmaster:notifications:replies',JSON.stringify(notification),String(Date.now()),id,notification.sender]]);
      if(Number(saved[0]?.result)===0)return res.status(404).json({ok:false,error:'Lượt thi đã bị xóa.'});

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
