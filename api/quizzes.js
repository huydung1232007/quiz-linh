const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
    try {
        // Trỏ tới thư mục "quizzes" ở gốc dự án
        const dirPath = path.join(process.cwd(), 'quizzes');

        if (!fs.existsSync(dirPath)) {
            return res.status(200).json([]);
        }

        // Lấy tất cả các file có đuôi .json
        const files = fs.readdirSync(dirPath).filter(file => file.endsWith('.json'));
        const allQuizzes = [];

        for (const file of files) {
            try {
                const filePath = path.join(dirPath, file);
                const content = fs.readFileSync(filePath, 'utf8');
                const parsed = JSON.parse(content);

                if (Array.isArray(parsed)) {
                    allQuizzes.push(...parsed);
                } else if (parsed && typeof parsed === 'object') {
                    // Nếu quên đặt id trong file json thì lấy luôn tên file làm id
                    if (!parsed.id) parsed.id = 'q-' + file.replace('.json', '');
                    allQuizzes.push(parsed);
                }
            } catch (fileErr) {
                console.error(`Bỏ qua file lỗi ${file}:`, fileErr.message);
            }
        }

        // Tắt cache để mỗi khi bạn thêm file mới lên Vercel là thấy ngay
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        return res.status(200).json(allQuizzes);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
