## Mục tiêu bài học
Nắm các kiểu dữ liệu cơ bản, quy tắc đặt tên biến, cách ghi chú, các nhóm toán tử, nhập/xuất dữ liệu và phân biệt lỗi cú pháp, lỗi thực thi, lỗi logic. Nội dung theo bài Các khái niệm cơ bản trong giáo trình.
## 1. Kiểu dữ liệu và chuyển kiểu
int biểu diễn số nguyên; float biểu diễn số thực dấu phẩy động; complex biểu diễn số phức như 2 + 3j; str chứa văn bản; bool có True và False. None biểu thị sự vắng mặt của một giá trị, có kiểu NoneType và không phải số 0 hay chuỗi rỗng.
Số nguyên có thể viết ở hệ nhị phân 0b1010, bát phân 0o12, thập lục phân 0xA; cả ba ví dụ đều là 10. type() xem kiểu; int(), float(), str() chuyển kiểu nếu dữ liệu hợp lệ. int(3.9) cho 3, không làm tròn; int("3.9") gây ValueError.
```python
age = 20
height = 1.65
name = "Linh"
z = 2 + 3j
print(type(age).__name__)  # int
print(0b1010, 0o12, 0xA)  # 10 10 10
print(float("3.5"))       # 3.5
```
## 2. Định danh, biến, hằng và ghi chú
Tên biến phân biệt hoa thường, không bắt đầu bằng chữ số và không trùng từ khóa. student_name hợp lệ, còn 2student và class không hợp lệ. import keyword; keyword.kwlist cho danh sách từ khóa của phiên bản đang chạy.
Dấu = dùng để gán. Một tên có thể được gán lại sang giá trị khác kiểu. Python không có khai báo hằng bắt buộc; tên viết hoa như TAX_RATE là quy ước. Dùng # để ghi chú một dòng. Chuỗi ba nháy đầu hàm/module có thể là docstring; không nên hiểu mọi chuỗi ba nháy là comment.
## 3. Các nhóm toán tử
Số học: +, -, *, /, //, %, **. / chia thường; // chia lấy phần nguyên theo hướng làm tròn xuống, nên -7 // 2 là -4. % lấy phần dư; ** là lũy thừa. Ngoặc giúp xác định thứ tự tính, ví dụ (2 + 3) * 4 = 20.
So sánh: ==, !=, <, <=, >, >=. Gán kết hợp: +=, -=, *=, /=. Logic: and, or, not. Membership: in, not in. Bitwise trên số nguyên: &, |, ^, ~, <<, >>; với a=12 và b=15 thì a & b = 12, a | b = 15, a ^ b = 3.
Phân biệt is với ==: == so sánh giá trị, is so sánh cùng một đối tượng. Kiểm tra thiếu dữ liệu bằng value is None; không dùng is để so sánh số hay chuỗi.
## 4. Nhập và xuất dữ liệu
input() luôn trả chuỗi. Hãy chuyển sang int hoặc float trước khi tính toán. bool("False") vẫn là True vì chuỗi không rỗng; muốn nhận lựa chọn có/không, cần so sánh nội dung nhập.
```python
price = float(input("Đơn giá: "))
quantity = int(input("Số lượng: "))
total = price * quantity
print("Tổng tiền:", total, sep=" ")
print("{0:>5} {1:>12.2f}".format(quantity, total))
print(f"Thanh toán: {total:.2f}")
```
print có sep để ngăn cách các giá trị và end để đổi ký tự kết thúc dòng. format và f-string giúp căn lề, giới hạn chữ số hiển thị. Định dạng .2f không thay đổi giá trị lưu trong biến.
## 5. Phân biệt và xử lý lỗi
SyntaxError xuất hiện khi mã sai cú pháp, chẳng hạn thiếu dấu hai chấm. Lỗi thực thi gồm ZeroDivisionError, ValueError, NameError. Lỗi logic có thể không phát sinh ngoại lệ nhưng cho kết quả sai; cần kiểm tra bằng dữ liệu đã biết đáp án.
Python dùng try/except, không dùng cú pháp try/catch. Bắt loại ngoại lệ cụ thể để biết lỗi nào đã xảy ra.
```python
try:
    number = int(input("Nhập số nguyên khác 0: "))
    print(10 / number)
except ValueError:
    print("Dữ liệu không phải số nguyên")
except ZeroDivisionError:
    print("Không thể chia cho 0")
```
## Hiểu cách biểu thức được tính, không chỉ nhớ ký hiệu
Khi gặp phép gán, Python tính vế phải trước rồi mới gắn tên ở vế trái. Với `x = x + 2`, giá trị x cũ được dùng trong phép cộng; không phải một phương trình toán học cần giải. Phép gán nhiều biến như `a, b = b, a` cũng tính toàn bộ vế phải trước, nên đổi chỗ hai giá trị mà không cần biến tạm.
```python
a, b = 3, 8
a, b = b, a
print(a, b)  # 8 3
x = 5
x += 2 * 3
print(x)     # 11
```
Trong ví dụ x, phép nhân chạy trước cho 6, sau đó cộng vào 5 để được 11. Với phép lũy thừa và dấu âm, `-2**2` là -4, còn `(-2)**2` là 4. Khi chưa chắc thứ tự, thêm ngoặc để diễn đạt đúng ý định.
## Bảng phân biệt những cặp dễ nhầm
| Cặp thao tác | Cách hiểu | Ví dụ kiểm tra |
| --- | --- | --- |
| Gán và so sánh | = gắn tên; == kiểm tra giá trị | x = 3 rồi x == 3 cho True |
| Chia và chia nguyên | / trả thương; // làm tròn xuống | 7 / 2 là 3.5; 7 // 2 là 3 |
| Chuỗi và số | Chuỗi nối ký tự, số cộng giá trị | "2" + "3" là "23"; 2 + 3 là 5 |
| Giá trị và đối tượng | == so sánh nội dung, is so cùng đối tượng | [1] == [1] là True; [1] is [1] là False |
## Bài mẫu có lời giải: tổng tiền và tiền thừa
Giả sử mua 3 quyển vở, mỗi quyển 12000 đồng và đưa 50000 đồng. Đầu vào gồm đơn giá, số lượng, tiền đưa. Xử lý gồm nhân giá với số lượng rồi lấy tiền đưa trừ tổng. Đầu ra gồm tổng và tiền thừa. Viết rõ ba bước này giúp tránh lẫn công thức.
```python
unit_price = 12000
quantity = 3
paid = 50000
total = unit_price * quantity
change = paid - total
print(f"Tổng: {total:,} đồng")   # Tổng: 36,000 đồng
print(f"Thừa: {change:,} đồng")  # Thừa: 14,000 đồng
```
Nếu tổng sai nhưng chương trình vẫn chạy, đó là dấu hiệu cần kiểm tra logic. Nếu số lượng nhập là chữ "ba", chuyển int gây ValueError. Nếu dùng tên total trước khi gán thì gây NameError. Đọc loại lỗi trước, sau đó nhìn dòng mã được báo và kiểm tra dữ liệu tại dòng đó.
## Tự giải rồi đối chiếu
Một bài đổi giây sang giờ–phút–giây cần dùng cả // và %. Với 3672 giây: giờ = 3672 // 3600 = 1; phần dư = 72; phút = 72 // 60 = 1; giây = 72 % 60 = 12. Hãy viết chương trình và thử thêm đầu vào 0, 59, 60 và 3600.
## Bài tập tự kiểm tra
Đổi 135 phút sang giờ và phút: 135 // 60 = 2, 135 % 60 = 15. Tính diện tích hình chữ nhật có cạnh 3 và 4: kết quả 12. Thử dự đoán kết quả của "2" + "3", 2 + 3, 7 / 2 và 7 // 2 trước khi chạy.
