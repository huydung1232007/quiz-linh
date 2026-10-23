## Mục tiêu bài học
Hiểu lưu trữ bền vững, phân biệt file văn bản/nhị phân, thực hiện mở–xử lý–đóng và làm quen XML, JSON, CSV, Excel. Ví dụ đọc/ghi chạy trong môi trường Python trên máy, không chạy trực tiếp trong phần văn bản của web.
## 1. Tập tin, đường dẫn và hai nhóm tác vụ
File giữ dữ liệu sau khi chương trình kết thúc. Tác vụ quản lý gồm đổi tên, di chuyển, kiểm tra tồn tại, xóa; tác vụ nội dung gồm đọc và ghi. Đường dẫn tương đối được tính từ thư mục làm việc hiện tại, không luôn từ vị trí file mã nguồn.
Văn bản được đọc thành str thông qua bảng mã như UTF-8. Nhị phân được đọc thành bytes. Cần chỉ định encoding="utf-8" khi làm việc với văn bản tiếng Việt để tránh phụ thuộc cấu hình máy.
## 2. Các chế độ mở file
r: chỉ đọc, file phải tồn tại. w: ghi, tạo file nếu chưa có và xóa nội dung cũ nếu đã tồn tại. a: ghi tiếp cuối, có thể tạo file. x: tạo mới, lỗi nếu file đã có. Thêm + để đọc và ghi; thêm b cho nhị phân, ví dụ rb và wb. open mặc định dùng chế độ rt, không phải rb.
Thuộc tính f.name cho tên file, f.mode cho chế độ, f.closed cho trạng thái đóng. Ưu tiên with để tự động đóng khi rời khối, kể cả khi có lỗi.
```python
with open("notes.txt", "w", encoding="utf-8") as f:
    f.write("Học Python\n")
with open("notes.txt", "a", encoding="utf-8") as f:
    f.write("Luyện xử lý tập tin\n")
with open("notes.txt", "r", encoding="utf-8") as f:
    for line in f:
        print(line.rstrip("\n"))
print(f.closed)  # True
```
## 3. Đọc và ghi đúng cách
read(n) đọc tối đa n ký tự ở chế độ văn bản, hoặc n byte ở chế độ nhị phân. read() đọc phần còn lại. readline() đọc một dòng; readlines() trả list dòng, đối số hint là gợi ý tổng kích thước, không phải số dòng. Đọc file lớn bằng for line in f giúp tránh nạp toàn bộ vào bộ nhớ.
write(str) ghi văn bản và trả số ký tự đã ghi; trong chế độ nhị phân dùng bytes. writelines(iterable) không tự thêm ký tự xuống dòng: cần có \n trong từng chuỗi. Sau khi đọc hết, lần đọc tiếp thường trả chuỗi rỗng cho đến khi đổi vị trí đọc bằng seek nếu được hỗ trợ.
## 4. Lỗi và quản lý file
FileNotFoundError xảy ra khi đọc file không tồn tại; PermissionError khi thiếu quyền. os.path.exists kiểm tra tồn tại; os.remove xóa file; os.rmdir chỉ xóa thư mục rỗng. Chỉ thử xóa trên file thực hành do bạn tạo. with đóng file nhưng tên biến f vẫn có thể còn tồn tại ngoài khối, lúc đó đối tượng đã đóng.
## 5. XML và JSON
XML biểu diễn cấu trúc bằng thẻ; giáo trình minh họa đọc bằng DOM/minidom. Có thể lấy danh sách thẻ employee rồi đọc id, name từ các nút con. DOM nạp cây tài liệu vào bộ nhớ; SAX xử lý theo sự kiện.
JSON ánh xạ tốt với dict/list và kiểu cơ bản của Python. dumps/loads làm việc với chuỗi; dump/load làm việc với đối tượng file.
```python
import json

student = {"name": "Linh", "score": 8}
text = json.dumps(student, ensure_ascii=False)
print(json.loads(text)["name"])  # Linh
with open("student.json", "w", encoding="utf-8") as f:
    json.dump(student, f, ensure_ascii=False, indent=2)
with open("student.json", encoding="utf-8") as f:
    restored = json.load(f)
```
## 6. CSV
CSV lưu bảng theo dòng và dấu phân cách. Dùng module csv thay vì tự split dấu phẩy, vì dữ liệu có thể chứa dấu phân cách trong dấu nháy. Mở với newline="" và encoding phù hợp; delimiter=";" khi file dùng chấm phẩy. csv.reader trả từng hàng dưới dạng list chuỗi, cần chuyển kiểu các cột số.
```python
import csv

with open("scores.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["name", "score"])
    writer.writerow(["Linh", 8])
with open("scores.csv", newline="", encoding="utf-8") as f:
    for row in csv.reader(f):
        print(row)
```
## 7. Excel
XlsxWriter dùng tạo file .xlsx, thêm worksheet, ghi ô, định dạng và chèn hình. Cần cài thư viện trước khi import. Phải ghi dữ liệu trước workbook.close(), không tiếp tục ghi vào workbook đã đóng.
```python
import xlsxwriter
from openpyxl import load_workbook

with xlsxwriter.Workbook("scores.xlsx") as workbook:
    sheet = workbook.add_worksheet("Diem")
    bold = workbook.add_format({"bold": True})
    sheet.write("A1", "Họ tên", bold)
    sheet.write("B1", "Điểm", bold)
    sheet.write("A2", "Linh")
    sheet.write("B2", 8)
wb = load_workbook("scores.xlsx", read_only=True)
try:
    for row in wb["Diem"].values:
        print(row)
finally:
    wb.close()
```
## Bảng chọn chế độ mở theo tình huống
| Mục đích | Chế độ | Nếu file đã có | Nếu file chưa có |
| --- | --- | --- | --- |
| Đọc văn bản | r | Đọc từ đầu | FileNotFoundError |
| Ghi lại toàn bộ | w | Xóa nội dung cũ | Tạo mới |
| Thêm nhật ký | a | Ghi tiếp cuối | Tạo mới |
| Chỉ tạo file mới | x | FileExistsError | Tạo mới |
| Đọc ảnh/dữ liệu byte | rb | Trả bytes | FileNotFoundError |
Không chọn w chỉ vì muốn mở file để xem: thao tác mở này đã có thể làm mất nội dung cũ, trước cả khi write. Với bài thực hành, dùng thư mục riêng và tên file mới để kiểm soát kết quả.
## Con trỏ đọc và dấu xuống dòng
Sau mỗi lần read hoặc readline, vị trí đọc tiến lên. Gọi read lần thứ hai không tự quay lại đầu. Với file hỗ trợ seek, `f.seek(0)` quay lại đầu để đọc lại. Dòng đọc bằng readline thường giữ \n cuối dòng; print lại sẽ thêm một xuống dòng nữa, nên dùng print(line,end="") hoặc loại \n trước.
```python
from io import StringIO
with StringIO("A\nB\n") as f:
    first = f.readline()
    rest = f.read()
    print(repr(first))  # 'A\n'
    print(repr(rest))   # 'B\n'
    print(repr(f.read()))  # ''
    f.seek(0)
    print(repr(f.read()))  # 'A\nB\n'
```
StringIO trong ví dụ đóng vai trò file văn bản trong bộ nhớ để quan sát luồng đọc mà không tạo file trên đĩa. Quy tắc về vị trí đọc tương tự file thông thường có thể seek.
## Ví dụ có lời giải: đọc CSV và tính trung bình
Giả sử CSV có hai cột name,score và hai dòng Linh,8; An,6. Quy trình là đọc tiêu đề, đọc từng dòng, chuyển cột điểm sang float rồi cộng. Không cộng trực tiếp các chuỗi vì "8" + "6" cho "86".
```python
import csv
from io import StringIO
sample = "name,score\nLinh,8\nAn,6\n"
with StringIO(sample) as f:
    rows = csv.DictReader(f)
    scores = [float(row["score"]) for row in rows]
average = sum(scores) / len(scores) if scores else None
print(average)  # 7.0
```
DictReader dùng hàng tiêu đề để tạo dict cho mỗi dòng. Nếu file thật thiếu cột score, cần báo lỗi dữ liệu thay vì tính kết quả không có căn cứ. File tiếng Việt có BOM có thể cần encoding="utf-8-sig" tùy cách được xuất.
## Phân biệt JSON, CSV, XML và Excel
JSON phù hợp cấu trúc lồng dict/list; CSV phù hợp bảng phẳng, thường không giữ kiểu số tự động; XML dùng thẻ và thuộc tính để mô tả cấu trúc; Excel có sheet, ô, công thức và định dạng. Không thể đọc Excel đúng chỉ bằng open(...).read() như văn bản thông thường. Chọn công cụ theo định dạng thực của file, không chỉ theo tên đuôi đã đổi.
## Bài tập tự kiểm tra
Ghi ba dòng văn bản rồi đọc lại và đếm dòng: kết quả phải là 3. Chuyển một list học viên sang JSON rồi đọc lại để kiểm tra dữ liệu. Giải thích sự khác nhau giữa w và a, giữa load và loads, giữa str và bytes.
