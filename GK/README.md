# DSS-Ky9

> **Hệ Hỗ Trợ Quyết Định (Decision Support Systems - DSS)**  
> **Đồ án Giữa kỳ: CFID Algorithm Visualizer**  
> Trực quan hóa thuật toán gợi ý địa điểm POI cho nhóm người dùng dựa trên lọc cộng tác kết hợp độ bất đồng nội bộ nhóm (Collaborative Filtering with Intragroup Divergence).

---

## 📌 Giới thiệu đề tài

Dự án hiện thực hóa và mô phỏng trực quan thuật toán từ bài báo khoa học:
> **"A Collaborative Filtering Algorithm with Intragroup Divergence for POI Group Recommendation"**  
> *Applied Sciences 2021, 11(12), 5416* — DOI: [10.3390/app11125416](https://doi.org/10.3390/app11125416)

Hệ thống giải quyết bài toán gợi ý địa điểm (Point of Interest - POI) cho một nhóm người dùng ($g$) thông qua:
1. Xây dựng sở thích theo thể loại địa điểm (Category Preference - TF-IDF).
2. Xây dựng sở thích theo thời gian ghé thăm (Time Preference - 4 khung giờ & ngày cuối tuần).
3. Mô hình hóa sở thích nhóm dựa trên mức độ gắn kết thành viên ($\eta_u^g$).
4. Tính toán độ tương đồng giữa nhóm và người dùng ngoài nhóm (đặc trưng + lịch sử check-in).
5. Dự đoán điểm gợi ý lọc cộng tác truyền thống ($f_{g,l}$).
6. Tính toán mức độ phân kỳ / bất đồng nội bộ giữa các thành viên nhóm ($d_{g,l}$).
7. Xếp hạng Top-$N$ POI tối ưu dung hòa giữa điểm ưa thích và giảm thiểu bất đồng ($f'_{g,l} = \alpha f_{g,l} - (1-\alpha) d_{g,l}$).

---

## 🚀 Công nghệ sử dụng

- **Frontend Framework**: React 19, TypeScript
- **Build Tool & Dev Server**: Vite 8
- **Toán học & Công thức**: KaTeX (`katex`, `@types/katex`)
- **Icon**: Lucide React
- **Kiểm thử tự động**: Vitest (18/18 test cases unit & integration phủ kín 8 bước thuật toán)
- **Linter**: Oxlint

---

## 📁 Cấu trúc thư mục

```text
GK/
├── Docs/                     # Tài liệu thiết kế & phân tích thuật toán
├── src/
│   ├── algorithms/           # Triển khai thuật toán CFID & KaTeX LaTeX templates
│   │   ├── cfid.ts           # Core logic: Step 1 đến Step 7 & công thức toán
│   │   └── mockData.ts       # Dữ liệu mẫu chuẩn hóa 5 users, 6 POIs
│   ├── components/           # Components giao diện (Bảng ma trận, Tham số, Chi tiết)
│   ├── types/                # Type definitions TypeScript
│   ├── tests/                # Test suites Vitest kiểm thử thuật toán
│   ├── App.tsx               # Giao diện chính trực quan hóa tương tác
│   ├── main.tsx              # Entry point React
│   └── index.css             # Thiết kế giao diện cao cấp & responsive
├── IMPLEMENTATION_PLAN.md    # Kế hoạch chi tiết và quyết định thiết kế
├── WALKTHROUGH.md            # Báo cáo thực thi & bảng số liệu kiểm chứng
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 🛠️ Cài đặt & Chạy ứng dụng

### 1. Yêu cầu môi trường
- Node.js >= 18
- npm hoặc pnpm / yarn

### 2. Cài đặt thư viện
```bash
npm install
```

### 3. Chạy môi trường phát triển (Development)
```bash
npm run dev
```
Mở trình duyệt tại [http://localhost:5173](http://localhost:5173) để trải nghiệm giao diện tương tác trực quan.

### 4. Chạy kiểm thử tự động (Unit Tests)
```bash
npm run test
```

### 5. Build sản phẩm (Production)
```bash
npm run build
```

---

## 📊 Kết quả kiểm thử mẫu (Deterministic Mock Dataset)

Mô phỏng nhóm mục tiêu $g = \{u_1, u_2, u_3\}$ (An, Bình, Cường), ngưỡng $\theta = 0.5$, trọng số cân bằng $\alpha = 0.7$:

| Hạng | POI Name | Thể loại | Điểm CF ($f_{g,l}$) | Độ bất đồng ($d_{g,l}$) | Điểm CFID ($f'_{g,l}$) | Đánh giá |
|:---:|---|:---:|:---:|:---:|:---:|---|
| **#1** | **Cà phê Blue Bottle ($l_1$)** | Quán cà phê | 1.0000 | 0.0000 | **0.7000** | Top-1 (Nhóm đã quen thuộc) |
| **#2** | **Quán Bar Skyline Rooftop ($l_4$)** | Quán bar | 0.2956 | 0.0000 | **0.2069** | **Khám phá mới tối ưu (chưa từng đi)** |
| **#3** | **Nhà hàng Pizza Joe ($l_3$)** | Nhà hàng | 0.2281 | 0.3333 | **0.0597** | Top-3 (Bị trừ điểm do có ý kiến bất đồng) |
| **#4** | **Công viên Trung tâm ($l_2$)** | Công viên | 0.2281 | 0.3333 | **0.0596** | Rank #4 |
| **#5** | **Bảo tàng Nghệ thuật ($l_5$)** | Bảo tàng | 0.1497 | 0.3333 | **0.0048** | Rank #5 |
| **#6** | **Tổ hợp Bowling ($l_6$)** | Thể thao | 0.0000 | 0.0000 | **0.0000** | Rank #6 |
