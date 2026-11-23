# PERSTOUR · Glasgow Flickr

Triển khai pipeline đề xuất lộ trình bằng bộ dữ liệu Glasgow của nhóm tác giả.
Ứng dụng chạy local với hai CSV đã có mã địa điểm và mã chuyến.

## Chạy từ thư mục dự án

Nếu cần cài thư viện vào môi trường `.venv` hiện có:

```bash
uv pip install --python .venv/bin/python -r requirements.txt
```

```bash
.venv/bin/python demo_flickr.py
.venv/bin/python -m streamlit run app.py
```

Lệnh Python chạy chuyến `733` với ngân sách 120 phút. Trên Streamlit, mở
[localhost:8501](http://localhost:8501), bấm **Nhập dữ liệu**, chọn chuyến kiểm tra
và bấm **Tính từng bước**. Giao diện đi từ bảng giờ chụp đến thời lượng lượt ghé,
thống kê điểm đến, sở thích, chi phí chặng và tuyến tối ưu.
Ở **Kết quả** có bảng thời gian cộng dồn, sơ đồ tuyến, đối chiếu với chuyến thật
và đánh giá cả 17 chuyến đủ điều kiện. Dừng server bằng **Ctrl+C**.

## Dữ liệu vào

| File | Cột dùng trong pipeline |
|---|---|
| `data/glasgow/POI-Glas.csv` | `poiID` là khóa địa điểm, `poiName` là tên hiển thị, `lat` và `long` là tọa độ, `theme` là loại địa điểm. |
| `data/glasgow/userVisits-Glas.csv` | `userID` và `seqID` nhóm ảnh theo người và chuyến. `dateTaken` là thời gian chụp UTC theo Unix timestamp. `poiID` liên kết ảnh với địa điểm. `photoID` phân thứ tự khi trùng giờ. |

Loại POI lấy từ `theme` của bảng địa điểm. Độ phổ biến được tính từ số lượt ghé trong tập train.
Loader bỏ qua `poiTheme` và `poiFreq` của bảng ảnh. Hai file lấy từ
[Flickr User-POI Visits của nhóm tác giả](https://sites.google.com/site/limkwanhui/datacode).

## Đọc pipeline trong code

| Bước | Hàm chính | Kết quả |
|---|---|---|
| Đọc CSV | `load_glasgow()` trong `perstour/flickr.py` | Gom ảnh liên tiếp cùng POI trong một chuyến. Một lượt ghé dài từ ảnh đầu đến ảnh cuối. |
| Chuẩn bị một chuyến | `GlasgowData.split()`, `GlasgowData.prepare_trip()` trong `perstour/flickr.py` | Giữ riêng chuyến test. Lấy người, điểm đầu và điểm cuối từ chuyến đó. Trả bài toán cùng train và test. |
| Tính thống kê | [`compute_statistics()`](perstour/statistics.py) | Tính trung bình và độ phổ biến theo POI, rồi tính sở thích của người dùng theo loại. Dùng công thức (1), (2) và Định nghĩa 6. |
| Lập bài toán | [`make_problem()`](perstour/problem.py), [`Problem.cost()`](perstour/models.py) | Tính phút tham quan theo (3), điểm POI cho (4) và phút đi bộ. Chi phí chặng cộng phút đi và phút tham quan điểm đến. |
| Giải tuyến | [`solve_milp()`, `solve_verified()`](perstour/solver.py) | Giải mục tiêu (4) với ràng buộc (5)–(9). Đối chiếu nghiệm bằng duyệt toàn bộ trong phạm vi 8 POI. |
| Đánh giá | `metrics()`, `evaluate_glasgow()` trong `perstour/evaluation.py` | So sánh với chuyến thật hoặc lần lượt giữ riêng từng chuyến đủ điều kiện. |

`demo_flickr.py`, `app.py` và đánh giá hàng loạt dùng chung `prepare_trip()`.
Train dùng các chuyến còn lại trong thành phố và giữ POI có ít nhất một lượt dương.
Ngân sách do cấu hình quy định. Chi phí mỗi chặng gồm phút đi bộ và phút ghé điểm đến.
Điểm mục tiêu tính trên các POI trung gian. Precision, Recall và F1 tính trên tập POI
gồm cả hai đầu tuyến, còn RMSE dùng thời lượng tại các POI trùng.

Kết quả mặc định là **21 → 2 → 20 → 16**, **108,11/120 phút**, **222,4232 điểm**
và **F1 85,71%**. Paper nằm trong thư mục [docs](docs/).

## Kiểm thử và mã lưu riêng

```bash
.venv/bin/python -m unittest discover -s tests -v
```

Dữ liệu giả lập, giao diện cũ và các baseline Python nằm trong [archive](archive/README.md).
