# PERSTOUR — học thuật toán từng bước bằng Python

Ứng dụng Streamlit tiếng Việt triển khai mô hình PERSTOUR trong paper đi kèm.
Nhập giá trị trên web, xem từng phép tính, rồi nhận tuyến được chọn.
Không cần API, bản đồ trực tuyến hay dữ liệu Flickr.

## Chạy với `.venv` hiện có, quản lý bằng uv

Tại thư mục dự án:

```bash
uv pip install --python .venv/bin/python -r requirements.txt
uv run --no-sync streamlit run app.py
```

Mở http://localhost:8501. `--no-sync` dùng nguyên môi trường đã cài, tránh thay
môi trường hiện có. Không cần tạo lại venv.

Muốn đọc ví dụ Python ngắn trước khi mở giao diện:

```bash
uv run --no-sync python demo.py
```

## Trang tổng quan

Ứng dụng mở ở **Tổng quan thuật toán**: đầu vào cần có, thứ tự tính,
ví dụ sở thích của An và bảng so sánh vài tuyến với B = 240 phút.
Ví dụ được tính bằng các hàm thật trên dữ liệu mẫu, độc lập với dữ liệu
bạn đang chỉnh. Bấm **Nhập dữ liệu →** để vào thực hành; chọn lại
**Tổng quan thuật toán** ở thanh bên để xem hướng dẫn bất cứ lúc nào.

## Nhập trực tiếp trên web

Ở bước **1 · Nhập dữ liệu**, mở **Điểm đến và lịch sử** để sửa hai bảng:

1. **POI:** mã, tên, loại, vĩ độ, kinh độ. Sửa ô trực tiếp, thêm dòng cuối
   bảng hoặc chọn dòng để xoá. Từ 2–8 POI để việc duyệt toàn bộ tuyến dễ hiểu.
2. **Lịch sử:** du khách, mã POI, giờ đến, số phút lưu lại. Có thể sửa, thêm,
   xoá hoặc dán nhiều ô từ Excel. Các lượt của cùng người không chồng thời gian.
3. Chọn du khách, điểm đầu/cuối; nhập số phút B và trọng số η.
4. Bấm **Tính từng bước →** để kiểm tra và lưu toàn bộ đầu vào. Nếu lỗi,
   sửa bảng rồi bấm lại. **Dữ liệu mẫu** khôi phục cả bảng và tham số.

Để có train/test, nhập ít nhất hai chuyến cách nhau hơn 8 giờ cho người muốn
nhận gợi ý. Sau khi giữ một chuyến làm test, mỗi POI vẫn cần có mẫu thăm
trong train để tính trung bình. Nếu chưa đủ, ứng dụng giữ màn hình nhập liệu
và báo POI thiếu dữ liệu để bạn bổ sung.

Dữ liệu nhập được lưu trong phiên trình duyệt. CSV gốc chỉ dùng để điền ví dụ
ban đầu và khôi phục; bạn không cần sửa file. Tải JSON ở bước cuối để giữ kết quả.

## Thực hành qua 7 bước

| Bước | Quan sát | Liên hệ paper |
|---|---|---|
| 1. Nhập dữ liệu | Hai bảng sửa trực tiếp, B, η, du khách, điểm đầu/cuối | Đầu vào §4 |
| 2. Ảnh → lượt thăm | Gán ảnh <200m, gom ảnh, tách chuyến >8 giờ | §4 bước 1–2 |
| 3. Trung bình & độ phổ biến | Thay số và xem V̄, số lượt thăm | (1) |
| 4. Sở thích | Bảng tỉ số từng lượt → thay số → tổng theo loại | (2), định nghĩa 6 |
| 5. Thời gian & điểm | Thay số T Visit, s(p), thời gian đi và Cost | (3), (4) |
| 6. Chọn tuyến | Cộng từng chặng; xét tuyến tiếp; giữ/loại và tuyến đang giữ | MILP (4–9) |
| 7. Kết quả | Sơ đồ, bảng cộng dồn, tổng phút, tổng điểm, thời gian dư | Nghiệm tối ưu |

Dùng **Tiếp / Quay lại** hoặc chọn bước ở thanh bên sau khi bắt đầu.
Trong bước 6, bấm **Xét tuyến tiếp** hoặc **Xét tất cả**. **Tính kết quả →**
giải toàn bộ và mở nghiệm cuối. **Sửa đầu vào** quay về bước đầu; bấm
**Tính từng bước →** để áp dụng thay đổi và bắt đầu lại.

Mỗi bước giữ dữ liệu liên quan, công thức thay số và biểu đồ. Tuỳ chọn
biến thể, chuyến giữ riêng và cá nhân hoá nằm trong **Tuỳ chọn mô hình**.
Tab so sánh, phần xem code và các đoạn giải thích lặp đã bỏ khỏi web để
tập trung vào luồng tính. `perstour/evaluation.py` vẫn giữ hàm so sánh cho Python.
Paper gốc nằm trong **Cách giải theo paper** ở bước chọn tuyến.

## Công thức — đọc theo đúng thứ tự này

Mọi thời gian trong code đều tính bằng **phút**.

```python
# (1) Trung bình tại POI p, trên các lượt TRAIN của mọi người:
average[p] = sum(visit_minutes_at_p) / number_of_visits_at_p
popularity[p] = number_of_visits_at_p

# (2) Sở thích của người u đối với loại c:
interest_time[c] = sum(user_visit.minutes / average[user_visit.poi]
                       for user_visit in training_visits_of_u
                       if category[user_visit.poi] == c)

# Định nghĩa 6: đếm lượt thăm của u thuộc loại c.
interest_frequency[c] = number_of_user_visits_in_category_c

# (3) Thời lượng cá nhân hoá, LUÔN dùng interest_time:
visit_time[p] = interest_time[category[p]] * average[p]

# (4) Điểm: chọn Time hay Frequency tuỳ biến thể.
score[p] = eta * interest[category[p]] + (1 - eta) * popularity[p]

# §3.2: chi phí một cạnh i -> j:
travel_time[i, j] = haversine_distance_km(i, j) / 4 * 60
cost[i, j] = travel_time[i, j] + visit_time[j]
```

Ví dụ mặc định: giữ `An/S3` làm test, dùng An/S1–S2 cùng lịch sử những người
khác để train. Ở P2, các lượt train dài **50, 15, 25** phút nên V̄(P2)=30.
P4 có V̄(P4)=(55+12+25)/3=30,6667. Sở thích nghệ thuật của An:

```text
Int Time(Nghệ thuật) = 50/30 + 55/(92/3) = 3,4601449
T Visit(P2) = 3,4601449 × 30 = 103,804348 phút
```

Với `B=240, η=0.5`, bộ duyệt chọn
`P1 → P3 → P5 → P6 → P7 → P8`, điểm `8.5662709465`, thời gian
`224.2590855821` phút. Một POI rất hợp sở thích vẫn có thể bị loại vì cần
quá nhiều thời gian thăm; mục tiêu là tổng điểm của cả tuyến trong B phút.

## Phần nào theo paper, phần nào là quy ước triển khai?

- Dùng trực tiếp các đại lượng trong công thức. Không min-max, không chia
  Int Time cho số lượt và không giới hạn thời lượng cá nhân hoá.
- Công thức (4) chỉ cộng điểm POI **trung gian**. Cost cộng thời gian thăm
  **điểm cuối**, không cộng thời gian thăm **điểm xuất phát**.
- Ngay cả PT-0, PT-.5F, PT-1F cũng dùng Int Time cho thời lượng cá nhân hoá
  theo (3). F chỉ thay sở thích trong hàm điểm.
- Paper in `departure_previous - arrival_next > τ` nhưng mô tả bằng lời là
  hai lượt cách nhau hơn τ. Code dùng `arrival_next - departure_previous > 8h`.
- Với (9), bỏ self-loop, cạnh vào đầu, cạnh ra cuối; áp dụng MTZ cho các đỉnh
  khác nhau. Biến cạnh nhị phân; biến thứ tự có thể liên tục trong [2,N].
- Paper dùng **lp_solve**. Bản Python dùng [SciPy MILP / HiGHS](https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.milp.html)
  để giải cùng mô hình. Chỉ nhận trạng thái đã chứng minh tối ưu; không gọi
  một nghiệm hết thời gian là tối ưu.
- **Duyệt tuyến là phần bổ sung để học và kiểm chứng**, không phải thủ tục
  mà paper đề xuất và không phải nhật ký nhánh cận của MILP. Với 6 điểm
  trung gian, có `Σ P(6,k) = 1.957` tuyến. Khi đồng điểm, bộ duyệt chọn thời
  gian ngắn hơn, rồi thứ tự mã; MILP có thể trả tuyến khác cùng điểm tối ưu.
- Nếu nhiều POI trong 200m, chọn gần nhất. Chụp lại cùng POI sau khi đã đi
  điểm khác là một lượt mới. Paper không mô tả chi tiết hai trường hợp này.
- Một lượt chỉ có một ảnh có thời lượng 0 và vẫn được tính vào trung bình.
  Nếu một POI không có train hoặc V̄=0, ứng dụng báo lỗi thay vì chia 0.
- Ảnh mock nằm đúng toạ độ POI để ví dụ dễ đọc, thêm một ảnh ngoài vùng
  để minh hoạ loại ảnh. Thuật toán Haversine vẫn dùng đúng ngưỡng <200m.
- Giữ một chuyến làm test trước khi tính **tất cả** thống kê. Trong chế độ
  đánh giá, lấy đầu/cuối và ngân sách thời gian từ chuyến đó. Precision,
  Recall, F1 tính trên tập POI, gồm đầu/cuối; RMSE chỉ trên POI trùng với test.
- Baseline dùng thời lượng trung bình, seed=42 và dự trữ đủ thời gian để
  tới điểm cuối. Paper chưa nêu chi tiết cách xử lý cạnh vượt ngân sách.
- Đây là **minh hoạ trên mock và một lượt leave-one-out được chọn**; chưa
  phải tái lập toàn bộ thực nghiệm Flickr nhiều thành phố hay trung bình
  cross-validation / bảng xếp hạng của paper.

## Đọc code ở đâu?

```text
app.py                  Giao diện Streamlit; không chứa công thức tối ưu
 demo.py                Ví dụ Python ngắn gọi lần lượt các bước
 perstour/core.py       Kiểu dữ liệu, Haversine, lượt thăm, công thức (1–4)
 perstour/solver.py     MILP (4–9) và bộ duyệt độc lập
 perstour/mock.py       Đọc ví dụ ban đầu, kiểm tra nhập web, sinh ảnh
 perstour/overview.py   Trang mở đầu và ví dụ giải thích thuật toán
 perstour/charts.py     Sơ đồ tuyến và timeline Plotly
 perstour/evaluation.py 5 biến thể, baseline, các metric
 data/pois.csv          POI mặc định
 data/visits.csv        Lịch sử mặc định để sinh ảnh
 tests/                 Tính tay, đối chiếu solver và tương tác giao diện
```

Nên đọc `demo.py` trước, rồi `compute_statistics`, `make_problem`,
`enumerate_routes`, cuối cùng `solve_milp`.

## Kiểm tra

```bash
uv run --no-sync python -m unittest discover -s tests -v
```

Các kiểm tra gồm công thức với số tính tay, ảnh ngoài bán kính, lượt thăm
lặp lại, biên 8 giờ, ngân sách đúng bằng chi phí, không có tuyến khả thi,
không rò dữ liệu test, đối chiếu MILP với duyệt trên 60 cấu hình, nhập web,
7 bước giao diện và điều khiển duyệt tuyến. Kiểm thử giao diện dùng
[Streamlit AppTest](https://docs.streamlit.io/develop/concepts/app-testing).
