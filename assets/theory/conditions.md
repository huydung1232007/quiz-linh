## Mục tiêu bài học
Vận dụng biểu thức Boolean, if, if/else, elif, cấu trúc lồng nhau, pass, biểu thức điều kiện, so sánh số thực và xử lý ngoại lệ. Các nhóm nội dung theo bài Cấu trúc rẽ nhánh và điều kiện.
## 1. Boolean và khối lệnh
Điều kiện được đánh giá thành đúng hoặc sai. False, None, số 0, chuỗi rỗng và collection rỗng có giá trị logic sai; chuỗi "False" không rỗng nên vẫn đúng. Dùng and/or/not để kết hợp điều kiện; and và or đánh giá ngắn mạch.
Python xác định khối lệnh bằng thụt lề. Dòng if/elif/else kết thúc bằng dấu hai chấm; dùng bốn dấu cách nhất quán. Câu lệnh ở cùng mức thụt lề sau khối không thuộc nhánh đó.
## 2. if, if/else và elif
if độc lập chỉ thực hiện thân khi điều kiện đúng. if/else chọn một trong hai nhánh. Chuỗi if/elif/else chọn nhánh đúng đầu tiên, không chạy tất cả nhánh có điều kiện đúng.
```python
score = 8
if not 0 <= score <= 10:
    print("Điểm không hợp lệ")
elif score >= 8:
    print("Giỏi")
elif score >= 6.5:
    print("Khá")
elif score >= 5:
    print("Đạt")
else:
    print("Chưa đạt")
```
Kết quả là Giỏi. Nếu kiểm tra >= 5 trước >= 8, điểm 8 sẽ bị xếp vào nhánh Đạt. Nhiều if riêng biệt lại có thể cùng chạy; dùng cách này khi cần kiểm tra những đặc tính độc lập.
## 3. Cấu trúc lồng nhau và pass
Có thể đặt if bên trong một nhánh để kiểm tra theo nhiều tầng. Ví dụ, kiểm tra người dùng có tài khoản trước, rồi mới kiểm tra mật khẩu. Khi điều kiện đơn giản, kết hợp bằng and có thể dễ đọc hơn lồng quá sâu.
pass là câu lệnh không làm gì, dùng để giữ chỗ khi một khối chưa được triển khai. Nó không kết thúc hàm hay thoát vòng lặp.
## 4. Biểu thức điều kiện
Cú pháp value_if_true if condition else value_if_false tạo một giá trị. Hữu ích khi gán kết quả ngắn, không nên lồng nhiều tầng khó đọc.
```python
number = -3
label = "Không âm" if number >= 0 else "Âm"
print(label)  # Âm
```
## 5. So sánh số thực và Decimal
Số thực nhị phân có thể không biểu diễn chính xác một số thập phân. 0.1 + 0.2 == 0.3 thường là False. Với tính toán gần đúng, có thể kiểm tra chênh lệch trong ngưỡng phù hợp hoặc dùng math.isclose. Khi làm việc với số thập phân bằng Decimal, nên tạo từ chuỗi để tránh mang theo sai số float.
```python
import math
from decimal import Decimal, localcontext

print(math.isclose(0.1 + 0.2, 0.3))  # True
print(Decimal("0.1") + Decimal("0.2") == Decimal("0.3"))
with localcontext() as context:
    context.prec = 4
    print(Decimal(1) / Decimal(3))  # 0.3333
```
prec là số chữ số có nghĩa của phép tính Decimal, không phải số chữ số sau dấu chấm cố định. Ngưỡng so sánh float cần chọn theo đơn vị và độ chính xác bài toán.
## 6. try, except, finally và raise
try bao khối có thể lỗi; except xử lý một loại ngoại lệ. finally thực hiện dù khối try thành công hay phát sinh ngoại lệ, thường dùng để giải phóng tài nguyên. raise chủ động phát sinh lỗi khi dữ liệu vi phạm quy tắc.
```python
def divide(a, b):
    if b == 0:
        raise ValueError("Mẫu số phải khác 0")
    return a / b

try:
    print(divide(5, 0))
except ValueError as error:
    print(error)
finally:
    print("Đã kết thúc lần kiểm tra")
```
## Truy vết điều kiện theo từng nhánh
Không chỉ hỏi điều kiện nào đúng, hãy hỏi điều kiện nào được xét trước. Trong chuỗi phân loại điểm, với score=7 thì kiểm tra ngoài khoảng sai, >=8 sai, >=6.5 đúng, in Khá và bỏ qua phần còn lại.
| Điểm đầu vào | Nhánh chạy | Lý do |
| --- | --- | --- |
| -1 | Không hợp lệ | Nằm ngoài đoạn 0 đến 10 |
| 5 | Đạt | Không đạt ngưỡng 8 và 6.5, nhưng >=5 |
| 6.5 | Khá | Đúng ngay tại ngưỡng >=6.5 |
| 8 | Giỏi | Nhánh >=8 được xét trước |
| 11 | Không hợp lệ | Kiểm tra đầu vào được thực hiện đầu tiên |
Các dữ liệu đúng bằng ngưỡng thường phát hiện lỗi dùng > thay cho >=. Luôn thêm dữ liệu thấp hơn, bằng và cao hơn ngưỡng khi tự kiểm tra một chương trình rẽ nhánh.
## Ví dụ hoàn chỉnh: giải phương trình bậc nhất
Với a*x+b=0, chỉ được chia cho a sau khi biết a khác 0. Nếu a=0 và b=0 thì mọi x đều thỏa; nếu a=0 nhưng b khác 0 thì không có nghiệm. Cấu trúc lồng nhau phản ánh trực tiếp các trường hợp này.
```python
a, b = 2, -6
if a == 0:
    if b == 0:
        print("Vô số nghiệm")
    else:
        print("Vô nghiệm")
else:
    print("x =", -b / a)  # x = 3.0
```
Tự thay lần lượt (a,b) bằng (0,0), (0,5), (2,-6) để chạy cả ba nhánh. Nếu đặt phép tính -b/a trước if, chương trình có thể lỗi dù bên dưới đã có nhánh xử lý a=0.
## Ngắn mạch và tính an toàn của biểu thức
Trong `text != "" and int(text) > 0`, vế chuyển int chỉ được xét khi text không rỗng. Tuy nhiên chuỗi "abc" vẫn đi vào vế sau và lỗi; ngắn mạch không thay thế kiểm tra kiểu hay try/except. Với or, vế thứ hai chỉ được xét nếu vế đầu sai.
Không viết `x == 1 or 2` để kiểm tra x là 1 hoặc 2: số 2 có giá trị logic đúng, nên biểu thức sai ý định. Viết `x == 1 or x == 2`, hoặc `x in (1, 2)`. Với điều kiện pha and/or, dùng ngoặc để người đọc thấy rõ nhóm điều kiện.
## Khi nào dùng pass, return và raise?
pass giữ chỗ, chạy xong sẽ tiếp tục câu lệnh kế tiếp. return thoát lần gọi hàm và có thể trả giá trị. raise báo tình huống ngoại lệ cho nơi gọi xử lý. Nếu yêu cầu là từ chối dữ liệu không hợp lệ, pass sẽ không tự làm điều đó.
## Bài tập tự kiểm tra
Viết điều kiện năm nhuận: chia hết cho 400, hoặc chia hết cho 4 nhưng không chia hết cho 100. Kiểm tra 2000 và 2024 là nhuận, 1900 và 2023 không nhuận. Với phân loại điểm, thử các giá trị -1, 0, 5, 6.5, 8, 10 và 11 để kiểm tra ranh giới từng nhánh.
