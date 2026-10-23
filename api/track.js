
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

  const input = req.body || {};
  const safeString = (v, max = 200) =>
    String(v ?? "").slice(0, max);

  const now = new Date().toISOString();
  const normalizeQuestion = question => {
  const options = Array.isArray(question?.options) ? question.options.slice(0, 12).map(option => safeString(option, 8000)) : [];
  const validIndex = index => Number.isInteger(index) && index >= 0 && index < options.length;
  return question && typeof question === 'object' && options.length ? {
    number: Number(question.number),
    text: safeString(question.text, 20000),
    options,
    correct: validIndex(question.correct) ? question.correct : null,
    selected: validIndex(question.selected) ? question.selected : null,
    explain: safeString(question.explain, 20000)
  } : null;
  };
  const currentQuestionData = Number(input.currentQuestionData?.number) === Number(input.currentQuestion) ? normalizeQuestion(input.currentQuestionData) : null;
  const questionSet = Array.isArray(input.examQuestionSet) ? input.examQuestionSet.slice(0,200).map((question,index) => normalizeQuestion({...question,number:index+1})) : null;

  const data = {
    eventType: safeString(input.eventType || "PROGRESS", 40),
    sessionId: safeString(input.sessionId || "", 150),
    playerName: safeString(input.playerName || "Ẩn danh", 80),
    quizCode: safeString(input.quizCode || "QUIZ", 40),
    quizTitle: safeString(input.quizTitle || "Đề thi", 120),
    currentQuestion: Math.max(0, Number(input.currentQuestion) || 0),
    currentQuestionData,
    totalQuestions: Math.max(0, Number(input.totalQuestions) || 0),
    actionDetail: safeString(input.actionDetail || "Cập nhật tiến độ", 180),
    answeredCount: Math.max(0, Number(input.answeredCount) || 0),
    correctCount: Math.max(0, Number(input.correctCount) || 0),
    answerSheet: safeString(
      input.answerSheet || "Chưa chọn câu nào",
      3500
    ),
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

  // Thực thi từng lệnh để xác định chính xác key gây lỗi.
  async function redis(commands) {
    const results = [];

    for (const command of commands) {
      const response = await fetch(redisBase, {
        method: "POST",
        headers: redisHeaders,
        body: JSON.stringify(command)
      });

      const raw = await response.text();
      let payload;

      try {
        payload = JSON.parse(raw);
      } catch {
        throw new Error(
          `Redis ${command[0]} ${command[1]}: ` +
          `HTTP ${response.status}; phản hồi không hợp lệ`
        );
      }

      if (!response.ok || payload.error) {
        const detail =
          typeof payload.error === "string"
            ? payload.error
            : JSON.stringify(payload.error || payload);

        throw new Error(
          `Redis ${command[0]} ${command[1]}: ${detail}`
        );
      }

      results.push(payload);
    }

    return results;
  }

  const escapeHtml = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const total = data.totalQuestions;
  const answered = Math.min(total, data.answeredCount);
  const correct = Math.min(answered, data.correctCount);
  const time = new Date(now).toLocaleString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh',hour12:false});
  const elapsed = Number.isFinite(Number(input.elapsedSeconds)) ? Math.max(0, Math.floor(Number(input.elapsedSeconds))) : null;
  const duration = Math.max(0, Number(input.durationMinutes) || 0);
  const elapsedText = elapsed === null ? 'Chưa có dữ liệu' : String(Math.floor(elapsed / 60)).padStart(2,'0') + ':' + String(elapsed % 60).padStart(2,'0');
  const isSubmit = data.eventType === 'SUBMIT';
  const message = [
    isSubmit ? '🏁 <b>ĐÃ NỘP BÀI</b>' : '🟢 <b>BẮT ĐẦU LÀM BÀI</b>',
    '',
    '👤 <b>' + escapeHtml(data.playerName) + '</b>',
    '📚 ' + escapeHtml(data.quizTitle),
    '🏷 Mã đề: <code>' + escapeHtml(data.quizCode) + '</code>',
    '',
    ...(isSubmit ? [
      '🎯 Điểm: <b>' + (total ? correct / total * 10 : 0).toFixed(1) + ' / 10</b>',
      '✅ Đúng: <b>' + correct + '</b>   ·   ❌ Sai: <b>' + Math.max(0, answered - correct) + '</b>',
      '📝 Đã trả lời: <b>' + answered + '/' + total + '</b>   ·   Bỏ trống: <b>' + Math.max(0,total - answered) + '</b>',
      '⏱ Thời gian làm bài: <b>' + elapsedText + '</b>'
    ] : [
      '📝 Số câu hỏi: <b>' + total + '</b>',
      '⏳ Thời lượng: <b>' + (duration ? duration + ' phút' : escapeHtml(data.timeLeft)) + '</b>'
    ]),
    '',
    '🕒 ' + escapeHtml(time) + ' · Giờ Việt Nam'
  ].join('\n');

  try {
    // Giữ nguyên key tiến độ của code cũ.
    await redis([
      ["SET", "quizmaster:live:latest", JSON.stringify(data)]
    ]);

    // Lưu từng session nếu frontend gửi sessionId.
    if (data.sessionId) {
      if (questionSet?.length) await redis([['SET', `quizmaster:live:questions:${data.sessionId}`, JSON.stringify(questionSet), 'EX', '604800']]);
      await redis([
        [
          "SET",
          `quizmaster:live:session:${data.sessionId}`,
          JSON.stringify(data),
          "EX",
          "604800"
        ]
      ]);

      // Dùng key mới để tránh xung đột kiểu dữ liệu cũ.
      await redis([
        ["SADD", "quizmaster:live:sessions:v2", data.sessionId]
      ]);

      await redis([
        ["EXPIRE", "quizmaster:live:sessions:v2", "604800"]
      ]);
    }

    // Dashboard continues receiving every event; Telegram only gets milestones.
    if (botToken && chatId && data.sessionId && ['START','SUBMIT'].includes(data.eventType)) {
      const notificationKey = 'quizmaster:telegram:event:' + data.sessionId + ':' + data.eventType;
      const lock = await redis([['SET', notificationKey, 'sending', 'EX', '60', 'NX']]);
      if (lock[0]?.result) {
        try {
          const response = await fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
            method:'POST', headers:{'Content-Type':'application/json'}, signal:AbortSignal.timeout(10000),
            body:JSON.stringify({chat_id:chatId,text:message,parse_mode:'HTML',disable_web_page_preview:true,
              reply_markup:{inline_keyboard:[[{text:'📊 Xem dashboard',url:'https://quiz-linh.vercel.app/dashboard.html'}]]}})
          });
          const result = await response.json();
          if (!response.ok || !result.ok) throw new Error('Telegram không gửi được thông báo');
          await redis([['SET', notificationKey, String(result.result.message_id), 'EX', '604800']]);
        } catch (error) {
          await redis([['DEL', notificationKey]]);
          console.error('[Telegram milestone]', error.message);
        }
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
