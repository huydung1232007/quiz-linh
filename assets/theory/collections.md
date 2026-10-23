## Mục tiêu bài học
Khai báo và thao tác với Tuple, Set, Dictionary; hiểu tính thứ tự, khả năng thay đổi, giá trị trùng, truy xuất, unpacking và các phương thức thường dùng.
## 1. Tuple: dãy có thứ tự, bất biến
Tuple hỗ trợ chỉ số, slicing, len, in và duyệt như list nhưng không cho gán lại phần tử hoặc xóa riêng từng phần tử. () là tuple rỗng; (50,) là tuple một phần tử; (50) chỉ là số 50. Dấu phẩy quyết định trường hợp một phần tử.
```python
values = (1, 2, 3, 2)
print(values.count(2))  # 2
print(values.index(2))  # 1
first, *middle, last = values
print(first, middle, last)  # 1 [2, 3] 2
```
index trả vị trí xuất hiện đầu và gây ValueError nếu không có. Tuple vẫn tìm kiếm được bằng in/index; bất biến không có nghĩa là không tìm kiếm. + và * tạo tuple mới. Đổi sang list rồi sửa rồi đổi lại cũng tạo tuple mới, không sửa tuple cũ.
Tuple có thể chứa list; list con đó vẫn thay đổi được. Tuple chỉ dùng làm khóa dictionary nếu mọi phần tử đều hashable.
## 2. Set: duy nhất và không có chỉ số
Set dùng {} hoặc set(iterable), nhưng set rỗng phải tạo bằng set(), vì {} là dictionary. Phần tử không trùng, không dựa vào thứ tự để truy cập. Set thay đổi được bằng thêm và xóa; phần tử cần hashable.
```python
numbers = {1, 2, 2, 3}
numbers.add(4)
numbers.update([4, 5])
numbers.discard(99)  # không lỗi dù 99 không tồn tại
print(sorted(numbers))  # [1, 2, 3, 4, 5]
```
remove(x) gây KeyError nếu thiếu x; discard(x) không gây lỗi trong trường hợp đó. pop() lấy một phần tử bất kỳ, không được coi là phần tử đầu/cuối. clear làm rỗng. Trong set, True và 1 được coi là cùng giá trị; False và 0 cũng vậy.
## 3. Các phép toán tập hợp
a | b là hợp, a & b là giao, a - b là hiệu, a ^ b là hiệu đối xứng. a <= b kiểm tra tập con, a >= b kiểm tra tập cha. Có thể dùng union, intersection, difference, symmetric_difference tương ứng.
```python
a = {1, 2, 3}
b = {3, 4}
print(sorted(a | b))  # [1, 2, 3, 4]
print(sorted(a & b))  # [3]
print(sorted(a - b))  # [1, 2]
print(sorted(a ^ b))  # [1, 2, 4]
```
## 4. Dictionary: ánh xạ khóa sang giá trị
Dictionary thay đổi được, giữ thứ tự chèn trong Python từ 3.7. Khóa là duy nhất và phải hashable; giá trị có thể trùng. Gán lại khóa hiện có cập nhật giá trị. in kiểm tra khóa, không kiểm tra giá trị.
```python
student = {"name": "Linh", "score": 8}
student["score"] = 9
student.update({"class": "Python"})
print(student.get("age", 0))  # 0
for key, value in student.items():
    print(key, value)
```
keys(), values(), items() lần lượt cho các khung nhìn khóa, giá trị và cặp khóa/giá trị. d[key] gây KeyError khi thiếu, còn get cho giá trị mặc định. pop(key) xóa và trả giá trị; del xóa theo khóa; clear xóa hết. copy là sao chép nông.
## 5. Bài toán đếm tần suất
```python
words = ["python", "list", "python"]
counts = {}
for word in words:
    counts[word] = counts.get(word, 0) + 1
print(counts)  # {'python': 2, 'list': 1}
```
Chọn list khi cần dãy thay đổi; tuple khi cần một nhóm cố định; set khi cần loại trùng và phép tập hợp; dictionary khi cần tra cứu theo khóa.
## So sánh để chọn đúng collection
| Cấu trúc | Truy cập thường dùng | Cho sửa nội dung? | Trùng lặp |
| --- | --- | --- | --- |
| List | Theo chỉ số | Có | Có |
| Tuple | Theo chỉ số | Không gán lại phần tử | Có |
| Set | Kiểm tra membership | Có thêm/xóa | Không giữ phần tử bằng nhau |
| Dictionary | Theo khóa | Có cập nhật giá trị | Khóa duy nhất, giá trị có thể trùng |
Dictionary giữ thứ tự chèn không có nghĩa là tự sắp xếp theo khóa. Muốn duyệt theo thứ tự chữ, dùng sorted(d) để lấy danh sách khóa đã sắp. Với set, hãy sắp bằng sorted khi cần đầu ra hiển thị nhất quán.
## Ví dụ hoàn chỉnh: thống kê và xếp tần suất từ
```python
text = "python list python set list python"
counts = {}
for word in text.split():
    counts[word] = counts.get(word, 0) + 1
ranking = sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))
print(ranking)  # [('python', 3), ('list', 2), ('set', 1)]
```
Mỗi lượt, get lấy số đếm cũ hoặc 0 nếu là từ mới, rồi cộng 1 và lưu lại. items cho cặp từ–số lượng. key sắp số lượng giảm bằng dấu âm và dùng tên từ tăng để phá hòa. Nếu chỉ cần danh sách từ duy nhất mà không cần tần suất, set sẽ ngắn gọn hơn dict.
## Những phương thức cần phân biệt
`set.update(iterable)` thêm các phần tử, còn add thêm một phần tử. `intersection_update` sửa set hiện tại bằng giao; intersection trả kết quả mới. `isdisjoint` kiểm tra hai tập không có phần tử chung; issubset và issuperset kiểm tra quan hệ bao hàm.
Với dict, `setdefault(key, default)` trả giá trị cũ khi khóa có sẵn; nếu chưa có, nó thêm default rồi trả default. `popitem()` lấy cặp được chèn gần nhất trong Python hiện đại. `dict.fromkeys(keys, value)` dùng cùng value cho mọi khóa: nếu value là một list, các khóa sẽ chia sẻ list đó.
## Tuple bất biến và đối tượng con
Với `record = ("Linh", [7,8])`, không thể gán record[0] thành tên mới, nhưng `record[1].append(9)` vẫn hợp lệ vì đang sửa list con. Tuple này không thể làm khóa dict do chứa list không hashable. Phân biệt bất biến của khung ngoài với tính chất của toàn bộ cấu trúc lồng.
## Bài tập tự kiểm tra
Tìm các tên có mặt trong cả hai lớp bằng giao hai set. Đếm ký tự trong chuỗi bằng dictionary. Giải thích vì sao [1,2] không làm khóa dict được, còn (1,2) có thể làm khóa.
