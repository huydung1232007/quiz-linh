## Mục tiêu bài học
Sử dụng while và for, hiểu range, break, continue, while/else, for/else và vòng lặp lồng nhau. Khi đọc mã, xác định trạng thái ban đầu, điều kiện, cập nhật và cách kết thúc vòng lặp.
## 1. Vòng lặp while
while kiểm tra điều kiện trước mỗi lượt. Nếu sai ngay từ đầu, thân không chạy lần nào. Phải bảo đảm biến điều khiển được cập nhật hoặc có đường thoát để tránh lặp vô hạn.
```python
n = 0
while not 1 <= n <= 10:
    n = int(input("Nhập số nguyên từ 1 đến 10: "))
print(n ** 2)
```
Ví dụ trên lặp lại khi số nằm ngoài đoạn cho phép. Nếu người dùng gõ chữ thay vì số, int gây ValueError; có thể bổ sung try/except từ bài trước.
## 2. for và range
for duyệt từng phần tử trong một iterable như list, tuple, chuỗi hoặc range. range(stop) bắt đầu ở 0; range(start, stop, step) không bao gồm stop. step không được bằng 0.
```python
print(list(range(5)))         # [0, 1, 2, 3, 4]
print(list(range(1, 7, 2)))   # [1, 3, 5]
print(list(range(5, 0, -2)))  # [5, 3, 1]
jobs = ["teacher", "singer"]
for index in range(len(jobs)):
    print(index, jobs[index])
```
Nếu step dương nhưng start lớn hơn stop, dãy rỗng. Với bước âm, cần đặt hai mốc theo hướng giảm. Duyệt trực tiếp phần tử khi không cần chỉ số; dùng enumerate khi cần cả chỉ số và giá trị.
## 3. break và continue
break thoát vòng lặp gần nhất ngay lập tức. continue bỏ phần còn lại của lượt hiện tại rồi chuyển sang lần kiểm tra/lượt kế tiếp. Trong while, nếu bước cập nhật đặt sau continue thì biến có thể không đổi và gây lặp vô hạn.
```python
total = 0
for number in range(1, 16, 2):
    if number in (3, 11):
        continue
    total += number
print(total)  # 50
```
Dãy số lẻ là 1,3,5,7,9,11,13,15. Bỏ 3 và 11, phần còn lại có tổng 50. Lập bảng theo từng lượt để xác định giá trị total thay vì tính theo cảm giác.
## 4. else của vòng lặp
else của for chạy khi duyệt hết dãy mà không gặp break. else của while chạy khi điều kiện kết thúc bình thường. continue không ngăn else; break có ngăn else. Vòng lặp không chạy lượt nào vẫn có thể chạy else.
```python
n = 17
if n < 2:
    print("Không nguyên tố")
else:
    for divisor in range(2, int(n ** 0.5) + 1):
        if n % divisor == 0:
            print("Không nguyên tố")
            break
    else:
        print("Nguyên tố")
```
else trong ví dụ gắn với for, không gắn với if bên trong. Cần nhìn mức thụt lề để đọc đúng luồng thực thi.
## 5. Vòng lặp lồng nhau
Mỗi lượt của vòng ngoài sẽ chạy toàn bộ vòng trong. Nếu vòng ngoài có 3 lượt và vòng trong luôn có 4 lượt, thân trong cùng chạy 12 lần. break bên trong chỉ thoát vòng trong; vòng ngoài tiếp tục.
```python
for row in range(1, 4):
    for column in range(1, 4):
        print(row * column, end=" ")
    print()
```
Kết quả gồm ba dòng: 1 2 3; 2 4 6; 3 6 9. print() sau vòng trong tạo xuống dòng sau mỗi hàng.
## Bảng truy vết: biến đếm khác biến tích lũy
Xét chương trình cộng từ 1 đến 4. Biến i điều khiển lượt; total lưu kết quả đã cộng. Cần khởi tạo total trước vòng lặp, nếu đặt trong thân thì mỗi lượt tổng lại bị xóa.
```python
total = 0
for i in range(1, 5):
    total += i
print(total)  # 10
```
| Lượt | i | total trước cộng | total sau cộng |
| --- | --- | --- | --- |
| 1 | 1 | 0 | 1 |
| 2 | 2 | 1 | 3 |
| 3 | 3 | 3 | 6 |
| 4 | 4 | 6 | 10 |
Điều kiện range(1,5) không lấy 5. Đổi stop thành 4 sẽ chỉ cộng 1+2+3=6; đây là lỗi lệch một đơn vị thường gặp.
## Ví dụ hoàn chỉnh: đếm số chữ số
Mỗi lần chia nguyên cho 10, số nguyên dương mất một chữ số cuối. Dùng biến count tăng một sau mỗi lần chia. Riêng số 0 có một chữ số, phải xử lý trước vòng lặp.
```python
number = 1204
remaining = abs(number)
count = 1 if remaining == 0 else 0
while remaining > 0:
    remaining //= 10
    count += 1
print(count)  # 4
```
Truy vết remaining: 1204 → 120 → 12 → 1 → 0. Có bốn lần cập nhật. Dùng abs giúp số âm được đếm theo phần chữ số, không tính dấu trừ. Thử thêm 0, 9, 10 và -123.
## Phân biệt thoát vòng với bỏ một lượt
Nếu đặt break khi gặp số âm, chương trình dừng duyệt hoàn toàn và không xét các phần tử phía sau. Nếu đặt continue, chương trình chỉ bỏ số âm đó rồi tiếp tục duyệt. Ví dụ với [2,-1,5], tổng số trước số âm là 2 nếu break, còn tổng số không âm là 7 nếu continue.
Vòng lặp else chỉ có ý nghĩa khi bạn hiểu lý do kết thúc. Duyệt hết nhưng không tìm thấy phần tử là kết thúc bình thường, nên else có thể dùng để báo không tìm thấy. Tìm thấy rồi break thì bỏ else.
## Tự xây dựng vòng lặp từ đề bài
Viết ra bốn câu trước khi code: dữ liệu bắt đầu là gì; khi nào tiếp tục; mỗi lượt thay đổi gì; kết quả cuối lấy từ biến nào. Với yêu cầu nhập đến khi gõ q, số lượt chưa biết nên while phù hợp. Với yêu cầu duyệt từng điểm trong list, for thường đơn giản hơn.
Không đổi biến của for với hy vọng điều khiển lượt kế tiếp: Python sẽ lấy phần tử tiếp theo từ iterable. Muốn thay đổi cách di chuyển vị trí một cách chủ động, hãy dùng while hoặc thiết kế iterable phù hợp.
## Bài tập tự kiểm tra
Tính tổng từ 1 đến n bằng biến tích lũy: với n=5 cho 15, n=0 cho 0. Tính tổng các số chẵn từ 1 đến 100: đáp án 2550. Thử viết chương trình tìm phần tử trong list và dùng for/else để báo không tìm thấy.
