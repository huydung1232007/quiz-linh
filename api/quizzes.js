
const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
    try {
        const dirPath = path.join(process.cwd(), 'quizzes');

        if (!fs.existsSync(dirPath)) {
            return res.status(200).json([]);
        }

        // Lấy tất cả file JSON và sắp xếp theo số trong tên file
        const files = fs.readdirSync(dirPath)
            .filter(file => file.endsWith('.json'))
            .sort((a, b) => {
                const numA = Number(a.match(/\d+/)?.[0] ?? 0);
                const numB = Number(b.match(/\d+/)?.[0] ?? 0);
                return numA - numB;
            });

        const allQuizzes = [];

        for (const file of files) {
            try {
                const filePath = path.join(dirPath, file);
                const content = fs.readFileSync(filePath, 'utf8');
                const parsed = JSON.parse(content);

                if (Array.isArray(parsed)) {
                    allQuizzes.push(...parsed);
                } else if (parsed && typeof parsed === 'object') {
                    if (!parsed.id) {
                        parsed.id = 'q-' + file.replace('.json', '');
                    }
                    allQuizzes.push(parsed);
                }
            } catch (fileErr) {
                console.error(`Bỏ qua file lỗi ${file}:`, fileErr.message);
            }
        }

        res.setHeader('Cache-Control', 'no-store, max-age=0');
        return res.status(200).json(allQuizzes);

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
