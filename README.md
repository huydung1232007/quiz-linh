# Linh Academy

Khóa học và kho đề nằm liên tiếp trên cùng trang `index.html`, đây là trang chính duy nhất cho cả học và thi. Không có trang HTML đề thi riêng. `/#exams` cuộn đến kho đề; làm đề trong bài học vẫn ngay dưới lý thuyết. Vercel chuyển đường dẫn cũ `/exams.html` về trang chung. Theo dõi thi: `dashboard.html`.

Trang giới thiệu chỉ hiển thị thẻ khóa học. Bấm thẻ hoặc nút Khám phá lộ trình để mở `/#course/python` và danh sách 10 bài; có thể thu gọn bằng nút đóng. Link từ bài học quay lại đúng lộ trình. Giao diện và hệ chữ Manrope nằm trong `assets/academy-refresh.css`, với kích thước tiêu đề theo component để tránh bị Tailwind preflight ghi đè.

10 bài học Python có lý thuyết theo 10 PDF trong `tài liệu lý thuyết`, ghi chú và tiến độ. Giữ nguyên 14 bộ đề hiện có. Link chia sẻ đề mở ngay trên trang chung. Bài Xử lý tập tin chưa có đề riêng trong quizzes nên chỉ hiển thị bài thực hành, không gắn nhầm đề.

## Nguồn đề duy nhất: quizzes

Thêm/sửa đề tại `quizzes/*.json`. Cả kho đề và bài học dùng chung `assets/quiz-repository.js`, không chép câu hỏi vào index. API tự đọc các file JSON trong thư mục. `node scripts/build-quizzes.cjs` tạo bản dự phòng `quizzes/catalog.js` để web vẫn mở đề được khi mở index trực tiếp hoặc khi không tải được JSON. Vercel chạy lệnh này tự động mỗi lần build; khi chạy local sau khi thêm/sửa JSON, chạy lại lệnh này để cập nhật bản dự phòng. Hỗ trợ file JSON chứa một đề hoặc mảng đề.

Đề luyện tập được làm trực tiếp dưới lý thuyết trong bài học hoặc từ kho đề trên cùng trang. Dùng chung bộ máy thi gốc tại `assets/exam-engine.js`: đếm giờ, gợi ý, ghi chú, chạy code, chấm điểm, lịch sử và xem giải thích. Không dùng iframe. `assets/exam-integration.js` kết nối các màn hình; `assets/exam-theme.css` áp dụng giao diện khóa học. Khi chuyển bài, phần thi được đóng; tiến độ thi vẫn do cơ chế lưu bài hiện có quản lý.

Lý thuyết ở `assets/theory/*.md`: mục tiêu, giải thích đầy đủ, bảng so sánh/truy vết, ví dụ Python 3 có lời giải, lưu ý và bài tập. Học trực tiếp trên web; không có khối mở/tải/đọc PDF. PDF gốc chỉ làm nguồn biên soạn. Chạy `node scripts/build-courses.cjs` để tạo `assets/course-data.js`. Vercel chạy bước này cùng bước chuẩn bị đề khi build. Giữ ID bài cũ để video, ghi chú và tiến độ đã lưu vẫn khớp.

Phía dưới lý thuyết là thẻ đề giống kho đề: mã đề, thời gian, số câu, trạng thái đã làm, nút Vào thi, chia sẻ và chỉnh sửa. Hai nơi dùng chung hàm `app.renderQuizCard`; vào thi tại bài học vẫn mở bộ máy thi gốc ngay bên dưới. Không có nút nhảy đến phần luyện đề.

## Thêm video MP4

Mở **Nội dung**, chọn bài học rồi chọn file MP4. Video được lưu trong IndexedDB của trình duyệt hiện tại, không tải lên máy chủ. Xóa dữ liệu trình duyệt có thể làm mất file và tiến độ.

Để mọi học viên xem: đưa MP4 lên hosting, nhập URL HTTPS hoặc đường dẫn như `/videos/bai-1.mp4`, bấm Lưu đường dẫn, Xuất cấu hình. Thay `courses-config.json` ở thư mục gốc bằng file đã xuất và triển khai cùng video. File xuất không chứa video và tài liệu trên máy. Video trên máy được ưu tiên khi có cả hai nguồn.

Ví dụ cấu hình: `{"videos":{"basics":"/videos/bai-1.mp4"}}`.

## Tài liệu

Chỉnh lý thuyết dùng chung tại `assets/theory/*.md`, rồi chạy build-courses như trên; bản TXT tải từ bài học chứa cùng nội dung và tên PDF nguồn. PDF gốc giữ trong thư mục `tài liệu lý thuyết`, không đổi tên nếu chưa cập nhật mapping tại `scripts/build-courses.cjs`. Mục Nội dung cho phép thêm một tài liệu bổ sung mỗi bài; file mới thay file cũ. Tài liệu bổ sung này chỉ lưu trong trình duyệt.

## Chạy web

Chạy `python -m http.server 8000`, mở `http://localhost:8000`. Kho đề có phương án đọc JSON trực tiếp khi chạy tĩnh. API theo dõi và Telegram cần Vercel cùng cấu hình Upstash/Telegram hiện có.

Phiên bản này chưa có tài khoản, thanh toán, tải file lên máy chủ hoặc đồng bộ học tập giữa thiết bị. Mục Nội dung là công cụ cấu hình cục bộ, không phải quản trị có xác thực.
