## Mục tiêu bài học
Định nghĩa và gọi hàm, hiểu ngăn xếp lời gọi, phạm vi biến, tham số mặc định/biến động, lambda, đệ quy, các hàm thông dụng và module. Nội dung tương ứng bài Hàm trong giáo trình.
## 1. Định nghĩa, docstring và return
def tạo hàm; thân hàm chạy khi được gọi. Tham số là tên trong định nghĩa, đối số là dữ liệu truyền khi gọi. Chuỗi đầu thân hàm có thể là docstring. return trả giá trị và kết thúc lần gọi; hàm không return giá trị trả None. print chỉ hiển thị, không thay thế return.
```python
def solve_linear(a, b):
    """Giải phương trình a*x + b = 0."""
    if a == 0:
        return "Vô số nghiệm" if b == 0 else "Vô nghiệm"
    return -b / a

print(solve_linear(5, 8))  # -1.6
```
## 2. Nguyên tắc lời gọi và phạm vi biến
Các lời gọi lồng nhau được quản lý theo ngăn xếp LIFO: hàm được gọi sau hoàn tất trước rồi trả điều khiển cho nơi gọi. Biến local nằm trong hàm; biến global ở mức module. Có thể đọc tên ở phạm vi ngoài nếu không bị tên local che khuất.
Gán một tên trong hàm thường làm tên đó thành local. Đọc tên local trước khi gán gây UnboundLocalError. global cho phép gán tên ở phạm vi module; nonlocal cho phép gán tên đã tồn tại trong hàm bao ngoài. Không cần nonlocal chỉ để đọc một biến ngoài.
```python
def make_counter():
    count = 0
    def increase():
        nonlocal count
        count += 1
        return count
    return increase

counter = make_counter()
print(counter(), counter())  # 1 2
```
## 3. Các kiểu tham số
Tham số mặc định cho phép bỏ đối số khi gọi. Đối số vị trí đi trước đối số từ khóa. Tham số trước / là chỉ theo vị trí; tham số sau * là chỉ theo từ khóa. *args nhận tuple đối số vị trí, **kwargs nhận dictionary đối số từ khóa.
```python
def total(*values, scale=1):
    return sum(values) * scale

print(total(1, 2, 3, scale=2))  # 12
def profile(**fields):
    return fields.get("name", "Ẩn danh")
print(profile(name="Linh"))   # Linh
```
Giá trị mặc định được tạo khi định nghĩa hàm, không phải mỗi lần gọi. Không dùng list mặc định nếu không muốn chia sẻ dữ liệu: dùng items=None rồi tạo [] trong thân khi items is None.
## 4. Lambda và hàm như một giá trị
lambda tạo hàm từ một biểu thức và trả kết quả biểu thức đó. Có thể truyền hàm cho hàm khác, như key của sorted. Không viết nhiều câu lệnh trong lambda; dùng def nếu logic phức tạp.
```python
def handle(function, x, y):
    return function(x, y)
print(handle(lambda x, y: x + y, 7, 9))  # 16
print(sorted(["aaa", "b", "cc"], key=lambda s: len(s)))
```
## 5. Đệ quy
Hàm đệ quy gọi lại chính nó, cần trường hợp cơ sở và bước tiến đến cơ sở. Với giai thừa, 0! = 1 và n! = n * (n-1)!. Đệ quy quá sâu có thể gây RecursionError; có thể thay bằng vòng lặp khi phù hợp.
```python
def factorial(n):
    if n < 0:
        raise ValueError("n phải không âm")
    if n == 0:
        return 1
    return n * factorial(n - 1)
print(factorial(6))  # 720
```
## 6. Các hàm và module thông dụng
math có sqrt, pow, log, log10, exp, sin/cos và đổi độ–radian bằng radians/degrees. Hàm lượng giác nhận radian. round(value,ndigits) làm tròn; chú ý sai số float và quy tắc làm tròn khi giá trị đúng giữa hai lựa chọn.
datetime biểu diễn ngày giờ và strftime định dạng: %d ngày, %m tháng, %Y năm, %H giờ, %M phút. random.randrange(start,stop,step) không lấy stop. sys.exit kết thúc bằng ngoại lệ SystemExit. eval đánh giá biểu thức Python, vì vậy không dùng eval(input()) cho dữ liệu không tin cậy; với số, dùng int/float.
Module là file .py chứa hàm, lớp, biến. import math dùng math.sqrt; import math as m tạo bí danh; from math import sqrt đưa một tên vào phạm vi hiện tại. Tránh import * khi muốn kiểm soát rõ các tên.
## Truy vết một lời gọi hàm
Khi chạy `result = double(3)`, đối số 3 được gắn cho tham số n trong lần gọi đó. Thân tính 2*n thành 6, return chuyển 6 về nơi gọi, rồi result nhận 6. Biến n cục bộ không tự xuất hiện ở phạm vi bên ngoài.
| Bước | Đang thực hiện | Giá trị |
| --- | --- | --- |
| 1 | Gọi double(3) | Truyền đối số 3 |
| 2 | Gắn tham số | n = 3 trong hàm |
| 3 | Tính 2*n | 6 |
| 4 | return | Trả 6 về bên gọi |
| 5 | Gán result | result = 6 |
Nếu thay return bằng print, số 6 vẫn xuất hiện trên màn hình nhưng result sẽ nhận None. Đây là cách kiểm tra nhanh khi hàm nhìn có vẻ chạy đúng nhưng phép tính tiếp theo lại lỗi.
## Ví dụ: cùng đối tượng nhưng khác tên biến
```python
def add_score(scores):
    scores.append(10)

def replace_scores(scores):
    scores = [0]
    return scores

values = [7, 8]
add_score(values)
print(values)  # [7, 8, 10]
new_values = replace_scores(values)
print(values, new_values)  # [7, 8, 10] [0]
```
append sửa đối tượng list mà bên gọi cũng đang tham chiếu. Gán scores=[0] chỉ gắn lại tên local; không tự gán lại tên values của bên gọi. Muốn dùng list mới, phải lấy kết quả return như new_values.
## Tham số mặc định có thể lưu trạng thái ngoài ý muốn
Một list mặc định được tạo một lần khi def chạy. Nếu hàm append vào list này, lần gọi sau có thể thấy dữ liệu từ lần trước. Dùng None để tạo list mới cho mỗi lần không truyền đối số.
```python
def collect(value, items=None):
    if items is None:
        items = []
    items.append(value)
    return items
print(collect(1))  # [1]
print(collect(2))  # [2], không phải [1, 2]
```
## Phân tích đệ quy theo hai chiều
Với factorial(3), chiều gọi đi xuống là factorial(3) → factorial(2) → factorial(1) → factorial(0). Ở điểm dừng trả 1. Chiều trả về đi ngược: factorial(1)=1, factorial(2)=2, factorial(3)=6. Chỉ nhìn chiều gọi mà quên chiều trả về sẽ khó hiểu kết quả.
Trước khi dùng đệ quy, xác định miền đầu vào hợp lệ, điểm dừng và cách giảm bài toán. Đầu vào âm cần bị từ chối vì n-1 càng đi xa 0. Với n lớn, vòng lặp có thể tránh giới hạn độ sâu lời gọi.
## Bài tập tự kiểm tra
Viết hàm tính trung bình, xử lý list rỗng. Truy vết factorial(3): 3*2*1*1 = 6. Viết module phép toán có hàm add rồi import từ file chương trình chính. Phân biệt return, print, break và sys.exit.
