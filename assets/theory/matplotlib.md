## Mục tiêu bài học
Nắm Figure/Axes, các loại biểu đồ, văn bản và biểu thức toán học, nhiều đối tượng trên cùng biểu đồ và bố cục nhiều phân vùng theo giáo trình Biểu diễn dữ liệu Matplotlib.
## 1. Thiết lập và thành phần biểu đồ
Cài matplotlib trước khi import matplotlib.pyplot as plt. Figure là khung hình tổng, Axes là vùng vẽ chứa trục và dữ liệu; Axis là thành phần quản lý một trục tọa độ. Có thể dùng pyplot hoặc giao diện đối tượng fig,ax; giao diện đối tượng thuận tiện khi có nhiều biểu đồ.
```python
import numpy as np
import matplotlib.pyplot as plt

x = np.arange(-4, 3, 0.1)
y = 3 * x**2 + 4 * x + 9
fig, ax = plt.subplots(figsize=(7, 4))
ax.plot(x, y, color="green", linestyle="--", label="Hàm bậc hai")
ax.set_xlabel("x")
ax.set_ylabel("y")
ax.set_title("Đồ thị hàm số")
ax.legend()
fig.tight_layout()
plt.show()
```
plot nối các điểm theo thứ tự đầu vào. Có thể chỉ định màu, marker, linestyle và linewidth; chuỗi định dạng như "ro--" thể hiện màu đỏ, chấm tròn, nét đứt.
## 2. Chọn loại biểu đồ
plot: xu hướng hoặc đồ thị hàm. bar/barh: so sánh các nhóm bằng cột đứng/thanh ngang. pie: tỉ trọng các phần trong tổng. hist: phân bố biến số theo các khoảng bins. scatter: mối liên hệ giữa hai biến. boxplot: tóm tắt phân bố và các điểm ngoại lệ theo quy tắc của biểu đồ hộp.
Với pie, dữ liệu cần phù hợp quan hệ phần–tổng; không đưa các nhóm chồng lấn vào cùng cơ cấu. Với bar, thường đặt mốc 0 để tránh phóng đại chênh lệch độ dài. Histogram khác bar ở chỗ các cột mô tả khoảng số liên tục; số bins ảnh hưởng hình dạng hiển thị.
## 3. Ví dụ cột, histogram và scatter
```python
fig, axes = plt.subplots(1, 3, figsize=(12, 3))
axes[0].bar(["A", "B", "C"], [8, 6, 9], color="seagreen")
axes[0].set_ylim(0, 10)
axes[0].set_title("So sánh điểm")
axes[1].hist([1, 2, 2, 3, 4, 4, 4, 5], bins=5)
axes[1].set_title("Phân bố")
axes[2].scatter([1, 2, 3, 4], [2, 3, 5, 6])
axes[2].set_title("Quan hệ hai biến")
fig.tight_layout()
plt.show()
```
Với cột nhóm, cần dịch vị trí x và chọn width để cột không chồng ngoài ý muốn. Cột xếp chồng dùng bottom. Với scatter, quan hệ quan sát được không tự chứng minh quan hệ nhân quả.
## 4. Contour và biểu đồ 3D
contour vẽ đường đồng mức, contourf tô vùng mức từ lưới X,Y và giá trị Z. np.meshgrid tạo lưới tọa độ. Axes có projection="3d" hỗ trợ contour3D, plot_wireframe và plot_surface.
```python
x = np.linspace(-3, 3, 30)
y = np.linspace(-3, 3, 30)
X, Y = np.meshgrid(x, y)
Z = np.sin(np.sqrt(X**2 + Y**2))
fig = plt.figure()
ax = fig.add_subplot(111, projection="3d")
ax.plot_surface(X, Y, Z, cmap="viridis")
plt.show()
```
## 5. Văn bản, nhãn và biểu thức toán học
set_title đặt tiêu đề vùng vẽ; fig.suptitle đặt tiêu đề toàn hình. set_xlabel/set_ylabel đặt tên trục. ax.text dùng tọa độ dữ liệu theo mặc định; annotate thêm chú thích có thể kèm mũi tên. Mathtext đặt biểu thức giữa hai dấu đô la, ví dụ r"$\alpha_i > \beta_i$".
## 6. Nhiều đối tượng và nhiều phân vùng
Gọi plot nhiều lần trên cùng ax để vẽ nhiều đường, đặt label cho từng đường rồi legend. subplot(nrows,ncols,index) đánh số vùng từ 1; subplots trả fig và ax/array axes; subplot2grid hỗ trợ vùng trải qua nhiều ô.
```python
fig, axes = plt.subplots(2, 2, figsize=(8, 6))
x = np.arange(1, 5)
axes[0, 0].plot(x, x*x, label="Bình phương")
axes[0, 0].plot(x, x, label="Tuyến tính")
axes[0, 0].legend()
axes[0, 1].bar(x, x*2)
axes[1, 0].scatter(x, x*x)
axes[1, 1].pie([2, 3, 5], labels=["A", "B", "C"])
fig.tight_layout()
fig.savefig("overview.png", dpi=150, bbox_inches="tight")
plt.show()
```
## 7. Trình bày và xuất kết quả
Chọn màu nhất quán, có độ tương phản và tránh trang trí thừa. Ghi tiêu đề, đơn vị, nhãn để người đọc hiểu đúng dữ liệu. tight_layout giúp giảm chồng nhãn; savefig lưu ảnh, nên gọi trước show khi không chắc môi trường đóng hình sau hiển thị.
## Từ câu hỏi đến loại biểu đồ
| Câu hỏi | Biểu đồ phù hợp | Điều cần kiểm tra |
| --- | --- | --- |
| Điểm thay đổi qua các tuần? | Đường | Thứ tự thời gian và khoảng cách trục x |
| Nhóm nào có điểm cao hơn? | Cột/thanh | Cùng đơn vị, nhãn nhóm rõ ràng |
| Điểm tập trung quanh vùng nào? | Histogram | Số bins và kích thước mẫu |
| Hai đại lượng có đi cùng nhau? | Scatter | Đơn vị hai trục, điểm ngoại lệ |
| Mỗi nhóm chiếm bao nhiêu trong tổng? | Pie | Các phần không chồng lấn, tổng có ý nghĩa |
Không chọn một biểu đồ chỉ vì đẹp. Trước tiên viết một câu hỏi và xác định dữ liệu nào trả lời nó. Nếu có nhiều nhóm nhỏ, biểu đồ cột có thể dễ đọc hơn biểu đồ tròn quá nhiều lát.
## Ví dụ có giải thích: hai đường trên cùng Axes
```python
weeks = [1, 2, 3, 4]
planned = [2, 4, 6, 8]
finished = [2, 3, 6, 7]
fig, ax = plt.subplots(figsize=(7, 4))
ax.plot(weeks, planned, "--", label="Kế hoạch")
ax.plot(weeks, finished, marker="o", label="Hoàn thành")
ax.set_xticks(weeks)
ax.set_xlabel("Tuần")
ax.set_ylabel("Số bài tích lũy")
ax.set_title("Tiến độ học tập")
ax.legend()
ax.grid(alpha=0.25)
fig.tight_layout()
plt.show()
```
Hai lần plot đều gọi trên ax nên cùng xuất hiện trong một vùng. Nếu tạo một Figure mới giữa hai lần, chúng sẽ không còn là hai đường trên cùng biểu đồ. label cung cấp tên cho legend; grid mờ giúp so giá trị mà không lấn át đường dữ liệu.
## Phân biệt dữ liệu, cách vẽ và cách trình bày
Dữ liệu là weeks/planned/finished. Cách vẽ là plot, bar hay scatter. Cách trình bày gồm màu, nhãn, giới hạn trục và chú giải. Khi biểu đồ sai, kiểm tra ba lớp theo thứ tự này: dữ liệu sai không thể sửa bằng đổi màu hoặc đổi kiểu đường.
Với plot/scatter, số phần tử x và y phải tương thích. Với pie, giá trị âm không phù hợp. Với histogram, cùng một bộ dữ liệu có thể nhìn khác khi thay bins; đừng kết luận có nhiều nhóm chỉ từ một lựa chọn bins ngẫu nhiên.
## Đọc bố cục subplot
`plt.subplots(2,2)` trả mảng axes hai chiều; truy cập axes[0,1] là hàng đầu, cột thứ hai. `plt.subplot(2,2,2)` lại dùng số thứ tự bắt đầu từ 1. Không trộn hai cách đánh chỉ số này.
Trước khi xuất hình, kiểm tra chữ có bị cắt, chú giải có che dữ liệu, thang điểm có nhất quán giữa các ô và ảnh có đủ độ phân giải. Nếu cần giữ tỉ lệ hình học như đường tròn, đặt aspect bằng nhau để đơn vị x và y có cùng kích thước hiển thị.
## Bài tập tự kiểm tra
Vẽ hai đường tròn bán kính 4 và 5 từ x=r*cos(theta), y=r*sin(theta), thêm chú giải và đặt ax.set_aspect("equal") để không méo. Tạo bố cục 2×2 với bốn loại biểu đồ và xuất PNG không cắt nhãn.
