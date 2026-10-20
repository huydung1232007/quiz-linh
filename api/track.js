// File: api/track.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Dán Token và Chat ID Telegram của bạn vào đây (hoặc cài trong Environment Variables của Vercel)
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7314382101:AAGpK17uSbmG6yu54qfiPCx0CaghxTevFpc";
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "6916057009";

    try {
        const {
            eventType,
            playerName,
            quizCode,
            quizTitle,
            currentQuestion,
            totalQuestions,
            actionDetail,
            answeredCount,
            correctCount,
            answerSheet,
            timeLeft
        } = req.body;

        let icon = "📡";
        if (eventType === 'SELECT_ANSWER') icon = "✍️";
        if (eventType === 'SUBMIT') icon = "🎓";

        const textMessage = 
`${icon} <b>[${quizCode}] ${quizTitle}</b>
👤 Thí sinh: <b>${playerName || 'Ẩn danh'}</b>
⚡ Hoạt động: ${actionDetail}

📍 Đang ở: <b>Câu ${currentQuestion}/${totalQuestions}</b>
📊 Đã chọn: <b>${answeredCount}/${totalQuestions}</b> (Đang đúng: <b>${correctCount}</b>)
⏳ Thời gian còn: <code>${timeLeft}</code>

📝 <b>Bảng đáp án đã chọn:</b>
<code>${answerSheet ? answerSheet.slice(0, 3500) : 'Chưa chọn câu nào'}</code>`;

        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

        await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: textMessage,
                parse_mode: 'HTML'
            })
        });

        return res.status(200).json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
