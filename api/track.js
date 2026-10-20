
// api/track.js — QuizMaster VN
// CommonJS cho Vercel; lưu tiến độ Redis, Telegram tùy chọn.

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

  // Telegram lấy từ Vercel Environment Variables.
  const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
  const chatId = process.env.TELEGRAM_CHAT_ID || "";

  if (!redisUrl || !redisToken) {
    console.error("[track.js] Missing Redis environment variables");
    return res.status(500).json({
      ok: false,
      error: "Missing Upstash Redis environment variables"
    });
  }

  const input = req.body || {};
  const clean = (value, max = 200) =>
    String(value ?? "").slice(0, max);

  const now = new Date().toISOString();
  const sessionId = clean(input.sessionId, 120);

  const answerResults = {};
  if (
    input.answerResults &&
    typeof input.answerResults === "object" &&
    !Array.isArray(input.answerResults)
  ) {
    for (const [key, value] of Object.entries(input.answerResults).slice(0, 200)) {
      answerResults[clean(key, 5)] = {
        selected: clean(value?.selected, 20).toUpperCase(),
        isCorrect: value?.isCorrect === true
      };
    }
  }

  const data = {
    sessionId,
    eventType: clean(input.eventType || "PROGRESS", 40),
    playerName: clean(input.playerName || "Ẩn danh", 80),
    quizCode: clean(input.quizCode || "QUIZ", 40),
    quizTitle: clean(input.quizTitle || "Đề thi", 120),
    currentQuestion: Math.max(0, Number(input.currentQuestion) || 0),
    totalQuestions: Math.max(0, Number(input.totalQuestions) || 0),
    actionDetail: clean(input.actionDetail || "Cập nhật tiến độ", 180),
    answeredCount: Math.max(0, Number(input.answeredCount) || 0),
    correctCount: Math.max(0, Number(input.correctCount) || 0),
    answerSheet: clean(input.answerSheet || "Chưa chọn câu nào", 3500),
    answerResults,
    timeLeft: clean(input.timeLeft || "--:--", 20),
    updatedAt: now
  };

  const redisBase = redisUrl.replace(/\/$/, "");
  const redisHeaders = {
    Authorization: `Bearer ${redisToken}`,
    "Content-Type": "application/json"
  };

  async function redis(commands) {
    const response = await fetch(`${redisBase}/pipeline`, {
      method: "POST",
      headers: redisHeaders,
      body: JSON.stringify(commands)
    });

    if (!response.ok) {
      throw new Error(`Redis HTTP ${response.status}`);
    }

    const result = await response.json();

    if (Array.isArray(result)) {
      const failed = result.find(item => item && item.error);
      if (failed) {
        throw new Error(String(failed.error));
      }
    }

    return result;
  }

  const escapeHtml = value =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const progress = data.totalQuestions
    ? Math.min(
        100,
        Math.round(data.answeredCount / data.totalQuestions * 100)
      )
    : 0;

  const message = [
    "📊 <b>QUIZMASTER LIVE DASHBOARD</b>",
    `👤 Thí sinh: <b>${escapeHtml(data.playerName)}</b>`,
    `📝 Đề: <b>${escapeHtml(data.quizCode)} — ${escapeHtml(data.quizTitle)}</b>`,
    `📍 Câu hiện tại: <b>${data.currentQuestion}/${data.totalQuestions}</b>`,
    `📈 Tiến độ: <b>${progress}%</b> (${data.answeredCount}/${data.totalQuestions})`,
    `✅ Số câu đúng tạm tính: <b>${data.correctCount}</b>`,
    `⏳ Thời gian còn: <code>${escapeHtml(data.timeLeft)}</code>`,
    `⚡ Hoạt động: ${escapeHtml(data.actionDetail)}`,
    "",
    "🧾 <b>BẢNG ĐÁP ÁN</b>",
    `<code>${escapeHtml(data.answerSheet)}</code>`,
    `🕒 Cập nhật: ${now.replace("T", " ").slice(0, 19)} UTC`
  ].join("\n");

  try {
    // Lưu dữ liệu tổng quan.
    await redis([
      ["SET", "quizmaster:live:latest", JSON.stringify(data)]
    ]);

    // Lưu từng lượt thi để dashboard nhiều thí sinh đọc được.
    if (sessionId) {
      await redis([
        [
          "SET",
          `quizmaster:live:session:${sessionId}`,
          JSON.stringify(data),
          "EX",
          604800
        ],
        [
          "SADD",
          "quizmaster:live:sessions",
          sessionId
        ],
        [
          "EXPIRE",
          "quizmaster:live:sessions",
          "604800"
        ]
      ]);
    }

    // Telegram tùy chọn. Redis đã lưu thì lỗi Telegram không làm API thất bại.
    if (botToken && chatId) {
      try {
        const stored = await redis([
          ["GET", "quizmaster:live:telegram_message_id"]
        ]);

        const messageId = stored?.[0]?.result
          ? Number(stored[0].result)
          : null;

        async function telegram(method, body) {
          const response = await fetch(
            `https://api.telegram.org/bot${botToken}/${method}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body)
            }
          );

          const result = await response.json();

          if (!response.ok || !result.ok) {
            throw new Error(
              result.description || `Telegram HTTP ${response.status}`
            );
          }

          return result;
        }

        const body = {
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true
        };

        if (messageId) {
          try {
            await telegram("editMessageText", {
              ...body,
              message_id: messageId
            });
          } catch (editError) {
            const sent = await telegram("sendMessage", body);
            await redis([
              [
                "SET",
                "quizmaster:live:telegram_message_id",
                String(sent.result.message_id)
              ]
            ]);
          }
        } else {
          const sent = await telegram("sendMessage", body);
          await redis([
            [
              "SET",
              "quizmaster:live:telegram_message_id",
              String(sent.result.message_id)
            ]
          ]);
        }
      } catch (telegramError) {
        console.error(
          "[track.js] Telegram error:",
          telegramError?.message || telegramError
        );
      }
    }

    return res.status(200).json({
      ok: true,
      updatedAt: now
    });
  } catch (error) {
    console.error("[track.js] Redis/storage error:", error?.message || error);

    return res.status(500).json({
      ok: false,
      error: "Không thể lưu tiến độ. Kiểm tra cấu hình và log Redis trên Vercel."
    });
  }
};
