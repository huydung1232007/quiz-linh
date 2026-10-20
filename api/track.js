// api/track.js — lưu từng lượt thi riêng trong Upstash Redis, không ghi đè giữa thí sinh.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Điền token và chat ID Telegram tại đây, chỉ trong API phía máy chủ.
  const botToken = "DAN_BOT_TOKEN_VAO_DAY";
  const chatId = "DAN_TELEGRAM_CHAT_ID_VAO_DAY";
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (botToken === "DAN_BOT_TOKEN_VAO_DAY" || chatId === "DAN_TELEGRAM_CHAT_ID_VAO_DAY") {
    return res.status(500).json({ ok: false, error: 'Hãy điền Bot Token và Chat ID trong api/track.js' });
  }
  if (!redisUrl || !redisToken) {
    return res.status(500).json({ ok: false, error: 'Missing Upstash Redis environment variables' });
  }

  const input = req.body || {};
  const safeString = (v, max = 200) => String(v ?? '').slice(0, max);
  const sessionId = safeString(input.sessionId || `legacy-${safeString(input.playerName || 'anon',40)}-${safeString(input.quizCode || 'QUIZ',30)}`, 120)
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const now = new Date().toISOString();
  const data = {
    sessionId,
    eventType: safeString(input.eventType || 'PROGRESS', 40),
    playerName: safeString(input.playerName || 'Ẩn danh', 80),
    quizCode: safeString(input.quizCode || 'QUIZ', 40),
    quizTitle: safeString(input.quizTitle || 'Đề thi', 120),
    currentQuestion: Math.max(0, Number(input.currentQuestion) || 0),
    totalQuestions: Math.max(0, Number(input.totalQuestions) || 0),
    actionDetail: safeString(input.actionDetail || 'Cập nhật tiến độ', 180),
    answeredCount: Math.max(0, Number(input.answeredCount) || 0),
    correctCount: Math.max(0, Number(input.correctCount) || 0),
    answerSheet: safeString(input.answerSheet || 'Chưa chọn câu nào', 3500),
    timeLeft: safeString(input.timeLeft || '--:--', 20),
    updatedAt: now
  };

  const redisBase = redisUrl.replace(/\/$/, '');
  const redisHeaders = { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' };
  async function redis(commands) {
    const r = await fetch(`${redisBase}/pipeline`, { method: 'POST', headers: redisHeaders, body: JSON.stringify(commands) });
    if (!r.ok) throw new Error('Redis request failed');
    const result = await r.json();
    if (Array.isArray(result) && result.some(x => x.error)) throw new Error('Redis command failed');
    return result;
  }
  const escapeHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  try {
    const sessionKey = `quizmaster:live:session:${sessionId}`;
    // Mỗi session có key riêng. ZSET là chỉ mục để dashboard lấy nhiều session.
    await redis([
      ['SET', sessionKey, JSON.stringify(data), 'EX', 604800],
      ['ZADD', 'quizmaster:live:sessions', String(Date.now()), sessionId],
      ['SET', 'quizmaster:live:latest', JSON.stringify(data), 'EX', 604800],
      ['ZREMRANGEBYRANK', 'quizmaster:live:sessions', '0', '-101']
    ]);

    // Telegram vẫn giữ kiểu một tin nhắn dashboard tổng hợp, tránh spam.
    const answers = data.answerSheet && data.answerSheet !== 'Chưa chọn câu nào' ? escapeHtml(data.answerSheet) : 'Chưa chọn câu nào';
    const progress = data.totalQuestions ? Math.min(100, Math.round(data.answeredCount / data.totalQuestions * 100)) : 0;
    const message = [
      '📊 <b>QUIZMASTER LIVE DASHBOARD</b>',
      `👤 Thí sinh: <b>${escapeHtml(data.playerName)}</b>`,
      `📝 Đề: <b>${escapeHtml(data.quizCode)} — ${escapeHtml(data.quizTitle)}</b>`,
      `📍 Câu hiện tại: <b>${data.currentQuestion}/${data.totalQuestions}</b>`,
      `📈 Tiến độ trả lời: <b>${progress}%</b> (${data.answeredCount}/${data.totalQuestions})`,
      `✅ Số câu đúng tạm tính: <b>${data.correctCount}</b>`,
      `⏳ Thời gian còn: <code>${escapeHtml(data.timeLeft)}</code>`,
      `⚡ Hoạt động: ${escapeHtml(data.actionDetail)}`,
      '', '🧾 <b>BẢNG ĐÁP ÁN</b>', `<code>${answers}</code>`,
      `🕒 Cập nhật: ${now.replace('T', ' ').slice(0, 19)} UTC`
    ].join('\n');

    const stored = await redis([['GET', 'quizmaster:live:telegram_message_id']]);
    const messageId = stored?.[0]?.result ? Number(stored[0].result) : null;
    let tgResponse;
    if (messageId) {
      tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: message, parse_mode: 'HTML', disable_web_page_preview: true })
      });
      const edited = await tgResponse.json();
      if (!tgResponse.ok || !edited.ok) tgResponse = null;
    }
    if (!messageId || !tgResponse) {
      tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML', disable_web_page_preview: true })
      });
      const sent = await tgResponse.json();
      if (!tgResponse.ok || !sent.ok) return res.status(502).json({ ok: false, error: 'Telegram send failed' });
      await redis([['SET', 'quizmaster:live:telegram_message_id', String(sent.result.message_id)]]);
    }

    return res.status(200).json({ ok: true, sessionId, updatedAt: now });
  } catch (err) {
    return res.status(502).json({ ok: false, error: 'Tracking backend failed' });
  }
}
