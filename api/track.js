
// api/track.js — lưu tiến độ thi và kết quả từng câu vào Upstash Redis.
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  // Điền thông tin Telegram của bạn tại đây.
  const botToken = "7314382101:AAGpK17uSbmG6yu54qfiPCx0CaghxTevFpc";
  const chatId = "6916057009";

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (
  !botToken ||
  !chatId ||
  botToken === "DAN_BOT_TOKEN_VAO_DAY" ||
  chatId === "DAN_TELEGRAM_CHAT_ID_VAO_DAY"
) {
  return res.status(500).json({
    ok: false,
    error: "Thiếu Telegram Bot Token hoặc Chat ID"
  });
}
  }

  if (!redisUrl || !redisToken) {
    return res.status(500).json({
      ok: false,
      error: "Missing Upstash Redis environment variables"
    });
  }

  const input = req.body || {};
  const safeString = (value, max = 200) =>
    String(value ?? "").slice(0, max);

  const eventType = safeString(input.eventType || "PROGRESS", 40);
  const now = new Date().toISOString();

  const answerResults = {};

  if (
    input.answerResults &&
    typeof input.answerResults === "object" &&
    !Array.isArray(input.answerResults)
  ) {
    for (const [key, value] of Object.entries(input.answerResults).slice(0, 200)) {
      answerResults[safeString(key, 5)] = {
        selected: safeString(value?.selected, 20).toUpperCase(),
        isCorrect: value?.isCorrect === true
      };
    }
  }

  const data = {
    eventType,
    playerName: safeString(input.playerName || "Ẩn danh", 80),
    quizCode: safeString(input.quizCode || "QUIZ", 40),
    quizTitle: safeString(input.quizTitle || "Đề thi", 120),
    currentQuestion: Math.max(0, Number(input.currentQuestion) || 0),
    totalQuestions: Math.max(0, Number(input.totalQuestions) || 0),
    actionDetail: safeString(input.actionDetail || "Cập nhật tiến độ", 180),
    answeredCount: Math.max(0, Number(input.answeredCount) || 0),
    correctCount: Math.max(0, Number(input.correctCount) || 0),
    answerSheet: safeString(input.answerSheet || "Chưa chọn câu nào", 3500),
    answerResults,
    timeLeft: safeString(input.timeLeft || "--:--", 20),
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
      throw new Error("Redis request failed");
    }

    const result = await response.json();

    if (Array.isArray(result) && result.some(item => item.error)) {
      throw new Error("Redis command failed");
    }

    return result;
  }

  const escapeHtml = value =>
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
        Math.round(data.answeredCount / data.totalQuestions * 100)
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
    // Lưu dữ liệu lượt thi hiện tại.
    await redis([
      ["SET", "quizmaster:live:latest", JSON.stringify(data)]
    ]);

    // Lưu theo sessionId để dashboard có thể hiển thị nhiều lượt thi.
    const sessionId = safeString(input.sessionId, 120);

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

    
    // Gửi Telegram độc lập: không để lỗi Telegram làm hỏng
    // phản hồi API khi dữ liệu Redis đã được lưu thành công.
    try {
      const stored = await redis([
        ["GET", "quizmaster:live:telegram_message_id"]
      ]);

      const messageId = stored?.[0]?.result
        ? Number(stored[0].result)
        : null;

      async function sendTelegram(method, body) {
        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/${method}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          }
        );

        return {
          httpOk: response.ok,
          data: await response.json()
        };
      }

      if (messageId) {
        const edited = await sendTelegram("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true
        });

        if (!edited.httpOk || !edited.data.ok) {
          const sent = await sendTelegram("sendMessage", {
            chat_id: chatId,
            text: message,
            parse_mode: "HTML",
            disable_web_page_preview: true
          });

          if (!sent.httpOk || !sent.data.ok) {
            throw new Error(
              sent.data?.description || "Telegram send failed"
            );
          }

          await redis([
            [
              "SET",
              "quizmaster:live:telegram_message_id",
              String(sent.data.result.message_id)
            ]
          ]);
        }
      } else {
        const sent = await sendTelegram("sendMessage", {
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true
        });

        if (!sent.httpOk || !sent.data.ok) {
          throw new Error(
            sent.data?.description || "Telegram send failed"
          );
        }

        await redis([
          [
            "SET",
            "quizmaster:live:telegram_message_id",
            String(sent.data.result.message_id)
          ]
        ]);
      }
    } catch (telegramError) {
      console.error(
        "[track.js] Telegram error:",
        telegramError?.message || telegramError
      );
    }

    // Redis đã lưu dữ liệu thì trả thành công,
    // kể cả khi Telegram tạm thời không gửi được.
    return res.status(200).json({
      ok: true,
      updatedAt: now
    });

  } catch (error) {
    console.error("[track.js]", error);

    return res.status(502).json({
      ok: false,
      error: "Tracking backend failed"
    });
  }
}
