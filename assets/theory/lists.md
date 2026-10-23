## Mục tiêu bài học
Hiểu collection, khai báo và duyệt List, chỉ số và slicing, cập nhật phần tử, thêm/xóa, sắp xếp, đảo, sao chép, nối và danh sách đa chiều.
## 1. Collection và khai báo List
List giữ thứ tự, cho phép phần tử trùng và cho phép thay đổi. Có thể chứa nhiều kiểu dữ liệu nhưng nên thống nhất kiểu khi xử lý số. [] tạo danh sách rỗng; [0.5] * 10 tạo mười phần tử số 0.5; len lấy số phần tử; in kiểm tra sự tồn tại.
```python
values = [5, 7, 2, 9, 6, 3, 10, 17, 16]
print(values[0], values[-1])  # 5 16
print(values[2:5])            # [2, 9, 6]
print(values[:-1])           # bỏ phần tử cuối
print(values[::-1])          # tạo list đảo thứ tự
```
Chỉ số đầu là 0, chỉ số -1 là cuối. Slicing lấy từ start đến trước stop. Truy cập một chỉ số vượt phạm vi gây IndexError, còn slicing thường được giới hạn về vùng có thật.
## 2. Duyệt và gán giá trị
Có thể duyệt trực tiếp, dùng for với range(len(values)), hoặc while. List comprehension tạo danh sách mới từ biểu thức và điều kiện lọc. Gán values[i] thay một phần tử; gán vào lát cắt có thể thay đổi cả độ dài.
```python
values = [2, 4, 6, 8]
values[1:2] = [5, 7]
print(values)  # [2, 5, 7, 6, 8]
squares = [x * x for x in values if x % 2 == 0]
print(squares)  # [4, 36, 64]
```
## 3. Thêm phần tử
insert(i,x) chèn trước vị trí i. append(x) thêm đúng một đối tượng vào cuối, kể cả x là list. extend(iterable) lấy từng phần tử của iterable để thêm vào cuối. Toán tử + tạo list nối mới.
```python
a = [1, 2]
a.append([3, 4])
print(a)  # [1, 2, [3, 4]]
b = [1, 2]
b.extend([3, 4])
b.insert(1, 9)
print(b)  # [1, 9, 2, 3, 4]
```
## 4. Xóa phần tử
remove(x) xóa lần xuất hiện đầu tiên của x và gây ValueError nếu không có. pop(i) xóa theo chỉ số và trả giá trị; pop() mặc định lấy cuối. clear() làm rỗng list. del values[i] hoặc del values[start:stop] xóa theo vị trí; del values xóa tên biến.
Không nên xóa trực tiếp các phần tử trong chính list đang được duyệt vì chỉ số có thể thay đổi. Thay vào đó, tạo list mới bằng điều kiện lọc.
## 5. sort, reverse, copy và nối
sort() sắp xếp tại chỗ, trả None; sorted(values) trả list mới. reverse() đảo thứ tự hiện tại, không phải sắp giảm dần. Dùng sort(reverse=True) để sắp giảm dần; key=str.lower để sắp chuỗi không phân biệt hoa thường.
b = a không sao chép: cả hai tên dùng cùng list. a.copy(), list(a) hoặc a[:] tạo bản sao nông; các list con vẫn có thể được dùng chung. Phân biệt nối bằng +/extend với append tạo thêm một phần tử lồng.
## 6. List đa chiều
Ma trận có thể biểu diễn bằng list chứa các list hàng. Truy cập matrix[row][column], duyệt bằng hai vòng for. Mỗi hàng cần là một đối tượng độc lập nếu muốn sửa từng ô riêng.
```python
matrix = [[0] * 3 for _ in range(2)]
matrix[0][0] = 9
print(matrix)  # [[9, 0, 0], [0, 0, 0]]
for row in matrix:
    print(*row)
```
Tránh [[0] * 3] * 2 trong tình huống này: hai vị trí hàng cùng tham chiếu một list, nên sửa một hàng có thể làm hàng còn lại thay đổi theo.
## Theo dõi danh sách sau mỗi thao tác
| Câu lệnh | List sau thao tác | Giá trị trả về |
| --- | --- | --- |
| a = [3,1,2] | [3,1,2] | Phép gán không phải lời gọi hàm |
| a.append(4) | [3,1,2,4] | None |
| a.insert(1,9) | [3,9,1,2,4] | None |
| a.pop(2) | [3,9,2,4] | 1 |
| a.sort() | [2,3,4,9] | None |
| a.reverse() | [9,4,3,2] | None |
Đừng gán `a = a.append(4)` hoặc `a = a.sort()`: biến a sẽ nhận None, không còn giữ list mong muốn. Với pop, ngược lại, giá trị trả về chính là phần tử bị lấy ra.
## Ví dụ hoàn chỉnh: xử lý bảng điểm
Tách chương trình thành lọc điểm hợp lệ, tính trung bình và xếp thứ tự. Không sửa list đầu vào để có thể đối chiếu lại dữ liệu gốc.
```python
raw = [8, 4, 11, 7, -1, 9]
valid = [score for score in raw if 0 <= score <= 10]
passed = [score for score in valid if score >= 5]
average = sum(valid) / len(valid) if valid else None
print(valid)                 # [8, 4, 7, 9]
print(passed)                # [8, 7, 9]
print(average)               # 7.0
print(sorted(passed, reverse=True))  # [9, 8, 7]
```
Giá trị 11 và -1 bị loại vì ngoài thang điểm, không phải vì trượt. Điểm 4 hợp lệ nhưng chưa đạt. Phân biệt hai tiêu chí này giúp tránh vô tình làm tăng trung bình bằng cách bỏ mọi điểm thấp.
## Sao chép và tham chiếu qua ví dụ
```python
a = [[1, 2], [3, 4]]
b = a.copy()
b[0][0] = 99
print(a[0][0])  # 99: hàng con vẫn được dùng chung
b[1] = [7, 8]
print(a[1])     # [3, 4]: thay cả hàng chỉ sửa list ngoài b
```
Sao chép nông tạo đối tượng list ngoài độc lập nhưng chưa sao chép mọi đối tượng con. Cần suy nghĩ tầng nào của cấu trúc được sửa. Với ma trận số đơn giản, `[row.copy() for row in matrix]` tạo cả các hàng mới; với cấu trúc lồng phức tạp, tìm hiểu deepcopy.
## Slicing với bước nhảy
`a[::2]` lấy chỉ số 0,2,4; `a[1::2]` lấy 1,3,5. Slicing thông thường tạo list mới. Khi gán lát cắt có step khác 1, số phần tử thay thế phải khớp số vị trí được chọn. Không xem slicing là luôn luôn có thể tăng/giảm độ dài.
## Bài tập tự kiểm tra
Tạo list điểm, lọc điểm >=5, sắp giảm dần và tính trung bình. Kiểm tra list rỗng trước khi chia cho len. Với [9,4,7,9,2], list đạt là [9,7,9], sắp giảm dần là [9,9,7].
