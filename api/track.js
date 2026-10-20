
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!redisUrl || !redisToken) {
    return res.status(500).json({
      ok: false,
      error: "Missing Upstash Redis environment variables"
    });
  }

  const safeString = (value, max = 200) =>
    String(value ?? "").slice(0, max);

  const input = req.body || {};
  const now = new Date().toISOString();

  const data = {
    eventType: safeString(input.eventType || "PROGRESS", 40),
    sessionId: safeString(input.sessionId || "", 150),
    playerName: safeString(input.playerName || "Ẩn danh", 80),
    quizCode: safeString(input.quizCode || "QUIZ", 40),
    quizTitle: safeString(input.quizTitle || "Đề thi", 120),
    currentQuestion: Math.max(0, Number(input.currentQuestion) || 0),
    totalQuestions: Math.max(0, Number(input.totalQuestions) || 0),
    actionDetail: safeString(input.actionDetail || "Cập nhật tiến độ", 180),
    answeredCount: Math.max(0, Number(input.answeredCount) || 0),
    correctCount: Math.max(0, Number(input.correctCount) || 0),
    answerSheet: safeString(input.answerSheet || "Chưa chọn câu nào", 3500),
    answerResults:
      input.answerResults &&
      typeof input.answerResults === "object" &&
      !Array.isArray(input.answerResults)
        ? input.answerResults
        : {},
    timeLeft: safeString(input.timeLeft || "--:--", 20),
    updatedAt: now
  };

  const redisBase = redisUrl.replace(/\/+$/, "");
  const redisHeaders = {
    Authorization: `Bearer ${redisToken}`,
    "Content-Type": "application/json"
  };

  // Gửi pipeline và chỉ rõ lệnh/key nào gây lỗi.
  async function redis(commands) {
    const response = await fetch(`${redisBase}/pipeline`, {
      method: "POST",
      headers: redisHeaders,
      body: JSON.stringify(commands)
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Redis HTTP ${response.status}: ${body.slice(0, 500)}`
      );
    }

    const result = await response.json();

    if (!Array.isArray(result)) {
      throw new Error("Redis returned an invalid pipeline response");
    }

    for (let i = 0; i < result.length; i++) {
      if (result[i]?.error) {
        const command = commands[i] || [];
        throw new Error(
          `Redis ${command[0] || "UNKNOWN"} ` +
          `${command[1] || "unknown-key"}: ${result[i].error}`
        );
      }
    }

    return result;
  }

  const escapeHtml = (value) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const answers =
    data.answerSheet && data.answerSheet !== "Chưa chọn câu nào"
      ? escapeHtml(data.answerSheet)
      : "Chưa chọn câu nào";

  const progress = data.totalQuestions
    ? Math.min(
        100,
        Math.round(
          (data.answeredCount / data.totalQuestions) * 100
        )
      )
    : 0;

  const message = [
    "📊 <b>QUIZMASTER LIVE DASHBOARD</b>",
    `👤 Thí sinh: <b>${escapeHtml(data.playerName)}</b>`,
    `📝 Đề: <b>${escapeHtml(data.quizCode)} — ${escapeHtml(data.quizTitle)}</b>`,
    `📍 Câu hiện tại: <b>${data.currentQuestion}/${data.totalQuestions}</b>`,
    `📈 Tiến độ trả lời: <b>${progress}%</b> (${data.answeredCount}/${data.totalQuestions})`,
    `✅ Số câu đúng tạm tính: <b>${data.correctCount}</b>`,
    `⏳ Thời gian còn: <code>${escapeHtml(data.timeLeft)}</code>`,
    `⚡ Hoạt động: ${escapeHtml(data.actionDetail)}`,
    "",
    "🧾 <b>BẢNG ĐÁP ÁN</b>",
    `<code>${answers}</code>`,
    `🕒 Cập nhật: ${now.replace("T", " ").slice(0, 19)} UTC`
  ].join("\n");

  try {
    // 1. Lưu trạng thái mới nhất, giống cách của code cũ.
    await redis([
      ["SET", "quizmaster:live:latest", JSON.stringify(data)]
    ]);

    // 2. Lưu trạng thái riêng của session nếu frontend gửi sessionId.
    if (data.sessionId) {
      await redis([
        [
          "SET",
          `quizmaster:live:session:${data.sessionId}`,
          JSON.stringify(data),
          "EX",
          "604800"
        ]
      ]);

      // Giữ nguyên tên key cũ để không tự ý làm lệch dashboard.
      await redis([
        ["SADD", "quizmaster:live:sessions", data.sessionId],
        ["EXPIRE", "quizmaster:live:sessions", "604800"]
      ]);
    }

    // 3. Telegram là tùy chọn; không cấu hình thì vẫn lưu tiến độ.
    if (botToken && chatId) {
      const stored = await redis([
        ["GET", "quizmaster:live:telegram_message_id"]
      ]);

      const messageId = stored[0]?.result
        ? Number(stored[0].result)
        : null;

      const telegramRequest = async (method, payload) => {
        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/${method}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          }
        );

        const result = await response.json();

        if (!response.ok || !result.ok) {
          throw new Error(
            `Telegram ${method} failed: ${
              result.description || response.status
            }`
          );
        }

        return result;
      };

      if (messageId) {
        try {
          await telegramRequest("editMessageText", {
            chat_id: chatId,
            message_id: messageId,
            text: message,
            parse_mode: "HTML",
            disable_web_page_preview: true
          });
        } catch (error) {
          // Tin cũ không sửa được thì gửi tin mới.
          console.error("[Telegram edit]", error.message);

          const sent = await telegramRequest("sendMessage", {
            chat_id: chatId,
            text: message,
            parse_mode: "HTML",
            disable_web_page_preview: true
          });

          await redis([
            [
              "SET",
              "quizmaster:live:telegram_message_id",
              String(sent.result.message_id)
            ]
          ]);
        }
      } else {
        const sent = await telegramRequest("sendMessage", {
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true
        });

        await redis([
          [
            "SET",
            "quizmaster:live:telegram_message_id",
            String(sent.result.message_id)
          ]
        ]);
      }
    }

    return res.status(200).json({
      ok: true,
      updatedAt: now
    });
  } catch (error) {
    const detail = String(
      error?.message || error || "Unknown error"
    );

    console.error("[api/track.js]", detail);

    return res.status(500).json({
      ok: false,
      error: "Không thể lưu tiến độ",
      detail
    });
  }
};
