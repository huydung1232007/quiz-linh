## Mục tiêu bài học
Hiểu vai trò của phân tích dữ liệu, tạo và thao tác ndarray, đọc/lưu mảng, indexing/slicing, thay đổi shape, ghép/tách, phép toán ma trận và thống kê theo trục.
## 1. Phân tích dữ liệu và thiết lập NumPy
Phân tích dữ liệu thường đi từ xác định câu hỏi, thu thập, làm sạch, khám phá/phân tích đến trình bày kết quả. NumPy cung cấp mảng số và phép toán vector để xử lý dữ liệu; Matplotlib dùng trình bày biểu đồ. Cài NumPy trong môi trường Python trước khi import numpy as np.
ndarray thường có dtype chung. shape là kích thước các chiều, ndim là số chiều, size là tổng phần tử. Mảng shape (3,) khác mảng cột shape (3,1).
## 2. Tạo mảng
```python
import numpy as np

a = np.array([[1, 2, 3], [4, 5, 6]], dtype=float)
print(a.shape, a.ndim, a.size)  # (2, 3) 2 6
print(np.zeros((2, 3)))
print(np.ones((2, 2)))
print(np.full((2, 2), 7))
print(np.arange(1, 7, 2))  # [1 3 5]
```
zeros/ones nhận shape; full nhận shape và giá trị lấp. arange dùng start,stop,step và không lấy stop. Với khoảng số thực, linspace hữu ích khi cần biết chính xác số điểm.
## 3. Truy xuất phần tử và lát cắt
```python
x = np.array([[1, 2, 3, 4],
              [4, 5, 6, 2],
              [7, 8, 9, 1],
              [2, 5, 1, 5]])
print(x[1, 2])       # 6
print(x[1:3, 1:3])   # [[5 6], [8 9]]
print(x[:3, ::2])    # [[1 3], [4 6], [7 9]]
print(x[x > 7])      # [8 9]
```
Chỉ số bắt đầu ở 0. Dấu : áp dụng độc lập cho từng trục. Slicing cơ bản thường trả view, nên sửa kết quả có thể sửa mảng gốc; dùng .copy() nếu cần độc lập. Với điều kiện mảng dùng (x>0) & (x<10), không dùng and/or.
## 4. reshape, transpose, ghép và tách
reshape đổi kích thước nhưng giữ tổng số phần tử; một chiều -1 để NumPy tự suy ra. transpose hoặc .T đổi thứ tự các trục. concatenate ghép theo trục sẵn có; stack tạo trục mới. split yêu cầu chia đều nếu chỉ định số phần bằng nhau; array_split cho phép kích thước không đều.
```python
b = np.arange(12).reshape(2, 6)
print(b.shape)      # (2, 6)
print(b.T.shape)    # (6, 2)
print(b.reshape(3, -1).shape)  # (3, 4)
left, right = np.split(b, 2, axis=1)
print(left.shape, right.shape)  # (2, 3) (2, 3)
```
## 5. Phép toán mảng và đại số tuyến tính
+,-,*,/ áp dụng theo phần tử khi shape tương thích. Broadcasting so sánh kích thước từ phải sang trái: hai chiều tương thích khi bằng nhau hoặc một chiều bằng 1. @ hoặc np.matmul là nhân ma trận, khác *.
np.linalg.det tính định thức ma trận vuông; np.linalg.inv tính nghịch đảo khi tồn tại; np.linalg.pinv tính giả nghịch đảo và không chỉ dành cho ma trận vuông. np.trace cộng đường chéo; .T chuyển vị.
## 6. Thống kê và chỉ số
min/max/mean/sum tổng hợp toàn mảng hoặc theo axis. Với mảng hai chiều, axis=0 gộp các hàng, trả kết quả theo cột; axis=1 gộp các cột, trả kết quả theo hàng. argmin/argmax trả vị trí; argsort trả các chỉ số theo thứ tự sắp. minimum/maximum so sánh từng phần tử, khác min/max giảm chiều.
```python
a = np.array([[1, 3, 6], [2, 7, 9]])
print(a.min())         # 1
print(a.min(axis=1))   # [1 2]
print(a.min(axis=0))   # [1 3 6]
print(a.sum(axis=0))   # [3 10 15]
```
## 7. Đọc và lưu mảng
np.save/np.load dùng .npy; np.savez lưu nhiều mảng trong .npz. np.savetxt/np.loadtxt đọc ghi bảng số văn bản, có thể chỉ định delimiter. Các ví dụ lưu file cần chạy trong môi trường Python có quyền ghi.
```python
np.save("scores.npy", a)
restored = np.load("scores.npy")
np.savetxt("scores.csv", a, delimiter=",", fmt="%d")
```
## Đọc shape và axis bằng ví dụ cụ thể
Giả sử ba hàng là ba học viên, hai cột là hai môn. Cộng theo axis=0 làm chiều hàng biến mất và giữ hai kết quả theo môn. Cộng theo axis=1 làm chiều cột biến mất và giữ ba kết quả theo học viên.
```python
scores = np.array([[6, 8], [8, 10], [10, 6]])
print(scores.shape)         # (3, 2)
print(scores.mean(axis=0))  # [8. 8.]
print(scores.mean(axis=1))  # [7. 9. 8.]
```
| Phép tính | Shape đầu ra | Ý nghĩa |
| --- | --- | --- |
| scores.sum() | Giá trị vô hướng | Tổng tất cả 6 điểm |
| scores.sum(axis=0) | (2,) | Tổng của từng môn |
| scores.sum(axis=1) | (3,) | Tổng của từng học viên |
| scores.mean(axis=1, keepdims=True) | (3,1) | Trung bình mỗi học viên, vẫn giữ hai chiều |
keepdims hữu ích khi lấy kết quả để tính tiếp với mảng gốc. Một vector shape (3,) không luôn thay được vector cột (3,1) vì quy tắc broadcasting khác nhau.
## Broadcasting từng bước
Với scores shape (3,2), trừ means shape (2,) là hợp lệ: chiều cuối 2 khớp 2; chiều hàng thiếu ở means được mở rộng. Nếu muốn trừ trung bình từng học viên, dùng mean(axis=1,keepdims=True) để có shape (3,1).
```python
centered = scores - scores.mean(axis=1, keepdims=True)
print(centered)
# [[-1.  1.]
#  [-1.  1.]
#  [ 2. -2.]]
```
Với hai mảng (2,3) và (2,), chiều cuối 3 và 2 không tương thích nên không thể cộng theo phần tử. Đừng chỉ nhìn tổng số phần tử; phải đối chiếu từng chiều từ phải sang trái.
## Nhân từng phần tử và nhân ma trận
Với A,B cùng shape (2,2), A*B nhân các ô tương ứng; A@B lấy tích vô hướng giữa hàng A và cột B. Đây là hai phép toán khác ý nghĩa dù đầu ra có thể cùng shape.
```python
A = np.array([[1, 2], [3, 4]])
B = np.array([[5, 6], [7, 8]])
print(A * B)  # [[5 12], [21 32]]
print(A @ B)  # [[19 22], [43 50]]
```
Ô đầu của A@B bằng 1*5 + 2*7 = 19. Tự tính một ô như vậy là cách kiểm tra nhanh bạn có đang dùng đúng loại phép nhân hay không.
## Quy trình tự giải bài mảng
Ghi shape đầu vào; xác định chỉ số hay lát cắt; ghi các trục bị tổng hợp; dự đoán shape đầu ra; cuối cùng mới tính giá trị. Với reshape, kiểm tra tích kích thước không đổi. Với slicing, nhớ stop không được lấy. Với argsort, kết quả là chỉ số chứ không phải chính các giá trị đã sắp.
## Bài tập tự kiểm tra
Cho a có shape (2,3), tính trung bình từng hàng và từng cột, ghi rõ shape kết quả. Giải thích vì sao reshape(4,2) không hợp lệ với mảng 6 phần tử. Tự lấy khối [[2,3],[5,6]] từ mảng x ở phần truy xuất.
