## Mục tiêu bài học
Hiểu cấu trúc chuỗi, truy cập ký tự, định dạng, ký tự thoát, Unicode và các phương thức xử lý văn bản trong bài Xử lý chuỗi.
## 1. Khai báo, Unicode và tính bất biến
Chuỗi str trong Python 3 là dãy điểm mã Unicode, không phải mảng byte. Có thể khai báo bằng nháy đơn, kép hoặc ba nháy để chứa nhiều dòng. Python không có kiểu ký tự riêng: một ký tự vẫn là str độ dài 1. Chuỗi không cho gán lại từng vị trí.
Muốn chuyển thành dữ liệu byte dùng encode; muốn chuyển byte về văn bản dùng decode cùng bảng mã. Số byte UTF-8 không luôn bằng len của chuỗi.
```python
text = "Linh học Python"
print(text[0])       # L
print(text[-1])      # n
print(text[0:4])     # Linh
print(text[::-1])    # đảo thứ tự
data = "Việt".encode("utf-8")
print(data.decode("utf-8"))  # Việt
```
## 2. Truy cập và slicing
Chỉ số bắt đầu ở 0; số âm tính từ cuối. s[start:stop:step] không lấy stop. Slicing vượt giới hạn thường được cắt về biên hợp lệ; chỉ số đơn vượt phạm vi gây IndexError. len đếm số điểm mã, không phải luôn số ký tự người dùng nhìn thấy khi có dấu tổ hợp.
## 3. Đổi hoa thường, làm sạch và thay thế
lower/upper đổi hoa thường; strip bỏ khoảng trắng hai đầu. replace(old,new,count) tạo chuỗi mới thay tối đa count lần nếu có count. Các phương thức không sửa chuỗi ban đầu, nên cần gán lại nếu muốn dùng kết quả.
```python
text = "  Hello World!  "
clean = text.strip().replace("World", "friends")
print(clean)                 # Hello friends!
print(clean.startswith("Hello"))  # True
print(clean.endswith("!"))        # True
```
startswith/endswith phân biệt hoa thường. strip("ab") bỏ các ký tự a/b ở hai đầu, không có nghĩa là chỉ bỏ một tiền tố nguyên vẹn "ab".
## 4. Tách, nối, đếm và tìm kiếm
split(separator) tạo list chuỗi con; split() không đối số tách theo khoảng trắng và gộp khoảng trắng liên tiếp. separator.join(parts) nối các chuỗi. count đếm lần xuất hiện không chồng lấn; find trả -1 khi không tìm thấy, còn index gây ValueError.
```python
record = "0912218,Tran Quang A,1991,CNTT"
fields = record.split(",")
print(fields[1])              # Tran Quang A
print(" | ".join(fields))
print("Hello World!".count("l"))  # 3
print("Hello World!".find("X"))   # -1
```
## 5. Các hàm kiểm tra và căn lề
isalnum kiểm tra chữ và số; isalpha kiểm tra chữ; isdigit kiểm tra chữ số; isspace kiểm tra khoảng trắng. Các kiểm tra này không chứng minh chuỗi luôn chuyển được sang một kiểu số mong muốn, đặc biệt với ký tự Unicode.
center(width,fillchar), rjust và ljust căn giữa/phải/trái. Chúng trả chuỗi mới; nếu width nhỏ hơn độ dài thì không cắt ngắn chuỗi gốc. fillchar phải là một ký tự.
## 6. Định dạng và ký tự thoát
Giáo trình giới thiệu định dạng %: %s cho chuỗi, %d cho số nguyên, %f cho số thực. Có thể dùng format hoặc f-string để viết rõ hơn. Ký tự thoát thường dùng gồm \n xuống dòng, \t tab, \\ cho dấu gạch chéo ngược và \" cho dấu nháy kép.
```python
name, weight = "Linh", 50
print("%s nặng %d kg" % (name, weight))
print("{:<8} {:>6.1f}".format(name, weight))
print(f"{name}: {weight:.1f} kg")
print("Dòng 1\nDòng 2")
path = r"C:\data\notes.txt"
print(path)
```
## Bảng truy xuất và slicing
Với `s = "Python"`, độ dài là 6. Chỉ số dương 0..5 tương ứng P,y,t,h,o,n; chỉ số âm -6..-1 tương ứng cùng các ký tự đó.
| Biểu thức | Kết quả | Cách đọc |
| --- | --- | --- |
| s[1] | y | Lấy đúng một vị trí |
| s[-2] | o | Vị trí thứ hai từ cuối |
| s[1:4] | yth | Lấy chỉ số 1,2,3 |
| s[::2] | Pto | Lấy 0,2,4 |
| s[::-1] | nohtyP | Bước âm, duyệt ngược |
| s[2:2] | Chuỗi rỗng | Không có vị trí nào trong lát cắt |
Nhớ rằng kết quả s[i] vẫn là chuỗi, không phải một kiểu char riêng. `s[6]` lỗi nhưng `s[:100]` vẫn cho toàn bộ chuỗi.
## Ví dụ có lời giải: chuẩn hóa họ tên
Đầu vào có khoảng trắng thừa ở đầu, cuối và giữa các từ. strip chỉ giải quyết hai đầu; muốn gộp khoảng trắng ở giữa cần split không đối số rồi join bằng một dấu cách.
```python
raw = "  Phan   Thi Ha   Linh  "
parts = raw.split()
normalized = " ".join(parts)
print(parts)       # ['Phan', 'Thi', 'Ha', 'Linh']
print(normalized)  # Phan Thi Ha Linh
print(parts[-1])   # Linh
```
Nếu đầu vào chỉ có khoảng trắng, parts là [], truy cập parts[-1] sẽ lỗi. Vì vậy trong chương trình thật cần kiểm tra `if parts` trước khi lấy tên cuối. Một hàm chuẩn hóa tốt phải định nghĩa rõ cách xử lý đầu vào rỗng.
## Kiểm tra chuỗi chứa số
`isdigit` không đồng nghĩa với chấp nhận mọi số hợp lệ: "-12" và "3.5" không phải chuỗi toàn chữ số dù có thể chuyển bằng int hoặc float tương ứng. Nếu mục tiêu là đọc số thực, thử float trong try/except chính xác hơn tự đoán bằng một hàm kiểm tra ký tự.
`find` trả -1 không phải vị trí tìm thấy. Nếu dùng kết quả đó làm chỉ số mà không kiểm tra, bạn vô tình lấy ký tự cuối chuỗi. Khi cần biết có hay không, dùng in thường rõ ràng hơn.
## Ghép văn bản có số và ký tự thoát
join chỉ nhận các phần tử chuỗi. Để nối [1,2,3] thành "1,2,3", cần `",".join(str(x) for x in values)`. Ký tự \n là một ký tự xuống dòng; chuỗi raw r"\n" chứa dấu gạch chéo và chữ n. Dùng repr khi muốn nhìn rõ ký tự thoát thay vì để print diễn giải chúng.
## Bài tập tự kiểm tra
Chuẩn hóa "  Linh   hoc  Python " bằng " ".join(text.split()) để được "Linh hoc Python". Kiểm tra chuỗi đối xứng sau khi chuyển chữ thường. Tách dòng CSV đơn giản bằng split để luyện chuỗi; khi đọc CSV thực tế có dấu nháy, dùng module csv của bài xử lý tập tin.
