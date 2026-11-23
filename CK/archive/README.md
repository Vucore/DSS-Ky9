# Bản giả lập PERSTOUR

Thư mục này giữ bộ CSV mẫu, trình nhập liệu, ví dụ từng bước, bộ gán ảnh theo
tọa độ và các baseline so sánh. Bản giả lập dùng chung phần tính thống kê và tối ưu
lộ trình với pipeline Glasgow.

Chạy từ thư mục gốc dự án.

```bash
.venv/bin/python -m archive.demo
.venv/bin/python -m streamlit run archive/app.py
.venv/bin/python -m unittest discover -s archive/tests -v
```
