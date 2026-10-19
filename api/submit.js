module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { playerName, quizCode, quizTitle, score, correct, total, timeSpent } = req.body;

        // Điền BOT_TOKEN và CHAT_ID của bạn (hoặc cấu hình trong Environment Variables của Vercel)
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7314382101:AAGpK17uSbmG6yu54qfiPCx0CaghxTevFpc';
        const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '6916057009';

        const message = 
            `🎯 *CÓ NGƯỜI VỪA NỘP BÀI THI!*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `👤 *Thí sinh:* ${playerName || 'Ẩn danh'}\n` +
            `📘 *Đề thi:* ${quizTitle} (\`#${quizCode}\`)\n` +
            `🏆 *Điểm số:* *${score} / 10* (${correct}/${total} câu đúng)\n` +
            `⏱ *Thời gian làm:* ${timeSpent}\n` +
            `🕒 *Lúc:* ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;

        // Gửi tới Telegram (và bạn cũng có thể nối thêm Google Sheets Webhook ở đây)
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        return res.status(200).json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
