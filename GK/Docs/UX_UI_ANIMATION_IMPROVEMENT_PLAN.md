# Kế hoạch cải thiện UX, UI và Animation cho CFID Visualizer

## 1. Bối cảnh và mục tiêu

Ứng dụng đã có nền tảng tốt cho mục đích học thuật: KaTeX cho ký hiệu, tách Train/Test, chế độ POI mới, bảng kiểm toán candidate, trace thay số, và pipeline 7 bước. Tuy nhiên, giao diện hiện hiển thị gần như toàn bộ năng lực đó cùng lúc. Người mới phải tự quyết định nên đọc kết quả, công thức, cấu hình hay bảng audit trước.

Mục tiêu của đợt cải thiện này là biến ứng dụng thành hai trải nghiệm rõ ràng:

1. **Xem kết quả nhanh**: hiểu Top-N POI mới và lý do đề xuất trong dưới một phút.
2. **Học CFID từng bước**: hiểu nguồn dữ liệu, công thức, kết quả trung gian và mối liên hệ giữa các bước mà không bị quá tải.

Animation chỉ phục vụ việc định hướng và phản hồi trạng thái. Không dùng animation để trang trí hoặc tạo thời gian chờ giả.

## 2. Đánh giá hiện trạng

### Những phần đã tốt

- `RunContextBar` cho biết nhóm mục tiêu, policy POI, split Train/Test và số candidate.
- Các ký hiệu chính được render bằng KaTeX thông qua `InlineMath` và `MathLabel`.
- `TraceInspector` đã gắn chi tiết phép tính với bước hiện hành.
- Bước 7 phân biệt Top-N POI mới, bảng điểm đầy đủ và candidate audit.
- CSS có breakpoint cho stepper và layout hai cột; bảng có wrapper cuộn ngang cục bộ.

### Vấn đề UX còn lại

| Vấn đề | Biểu hiện | Hệ quả cho người mới |
| --- | --- | --- |
| Quá nhiều lớp điều hướng | Header, context bar, toolbar, stepper 8 thẻ, công thức và panel trace cùng xuất hiện trước nội dung chính | Không biết thao tác đầu tiên và khó nhận ra đâu là kết quả |
| Bước 7 quá nhiều thông tin ngang cấp | Top-N, ranking table, candidate audit và trace đều là card lớn | Kết quả quan trọng không nổi bật hơn dữ liệu kiểm toán |
| Chạy toàn bộ và học từng bước chưa tách | `Chạy toàn bộ` đi đến bước cuối, nhưng màn cuối vẫn thiên về phân tích kỹ thuật | Không hỗ trợ mục tiêu “xem nhanh” |
| Stepper mang nhiều metadata | Mỗi thẻ chứa nhiều tag công thức | Lộ trình nhìn giống checklist kỹ thuật thay vì câu chuyện thuật toán |
| Motion chưa truyền đạt trạng thái | Hầu hết chỉ có hover transition; không có transition cho đổi bước, reveal kết quả hoặc chọn trace | Cảm giác nội dung thay đổi đột ngột, thiếu điểm neo thị giác |
| Nội dung nặng được tải cùng lúc | Bundle build hiện khoảng 601 KB JavaScript trước gzip | Khởi tạo có thể chậm hơn cần thiết cho người chỉ xem Top-N |

## 3. Nguyên tắc thiết kế

### 3.1. Một mục tiêu chính trên mỗi màn

- Chế độ kết quả: **Top-N POI mới** là chủ thể chính.
- Chế độ học: **đầu ra của bước hiện tại** là chủ thể chính.
- Cấu hình, ký hiệu đầy đủ, audit và trace là nội dung hỗ trợ, mở theo nhu cầu.

### 3.2. Progressive disclosure

Chỉ đưa chi tiết khi người dùng đã có lý do để cần nó:

- Công thức đầy đủ sau phần “bước này để làm gì”.
- Bảng ranking đầy đủ sau Top-N cards.
- Candidate audit sau summary “bao nhiêu POI đã bị loại”.
- Phép thay số sau khi chọn POI, hàng hoặc ô cụ thể.

### 3.3. Màu sắc có ý nghĩa ổn định

- Indigo: hành động chính và bước hiện hành.
- Emerald: POI đủ điều kiện / kết quả tích cực.
- Rose: penalty divergence, lỗi hoặc POI không hợp lệ.
- Amber: trạng thái cần chú ý, ví dụ mơ hồ Eq. (12).
- Không dùng nhiều badge màu nếu không đại diện cho trạng thái hoặc hành động khác biệt.

### 3.4. Motion phải có lý do

- Motion chỉ dùng cho chuyển ngữ cảnh, xác nhận thao tác và dẫn mắt tới thay đổi.
- Không animate bảng số liệu hàng loạt, không flash heatmap, không dùng spinner nếu phép tính đã hoàn thành tức thời.
- Luôn hỗ trợ `prefers-reduced-motion`.

## 4. Kiến trúc trải nghiệm đề xuất

### 4.1. Màn chào / lựa chọn mục đích

Sau khi nạp demo hoặc mở ứng dụng lần đầu, hiển thị một surface gọn với ba lựa chọn:

| Lựa chọn | Hành động | Điểm đến |
| --- | --- | --- |
| Xem Top-N POI mới | Chạy pipeline và mở phần kết quả tối giản | Bước 7, chỉ Top-N và một explanation card |
| Học thuật toán từng bước | Mở Bước 1 với hướng dẫn ngắn | Bước 1, Guided mode |
| Tùy chỉnh dữ liệu | Mở Bước 0 | Cấu hình dữ liệu / Train-Test |

Không hiển thị lại surface này trong cùng phiên sau khi người dùng đã chọn mode; cung cấp switch nhỏ trong toolbar để đổi mode.

### 4.2. Hai mode rõ ràng

#### A. Result mode

Mục tiêu: trả lời “nhóm nên đi đâu và tại sao?”

Thứ tự nội dung:

1. Context bar một dòng: nhóm, policy, số candidate.
2. Top-N cards, tối đa ba card trong viewport đầu tiên.
3. Selected recommendation breakdown: `alpha × CF - (1-alpha) × divergence`.
4. Hai accordion đóng mặc định:
   - `Xem toàn bộ điểm xếp hạng`.
   - `Kiểm toán POI bị loại`.

Result mode không hiển thị formula registry, vector feature hoặc trace panel bên phải cho tới khi người dùng bấm “Xem phép tính”.

#### B. Guided learning mode

Mục tiêu: trả lời “CFID đi từ lịch sử check-in đến Top-N như thế nào?”

Mỗi bước có cùng bố cục:

1. `Bạn đang ở bước X/7` và tên bước.
2. **Tại sao cần bước này?** - tối đa hai câu.
3. **Đầu vào** - hiển thị bằng chip/list rất ngắn.
4. **Tính toán chính** - một công thức chính và output table.
5. **Kết luận** - một câu có số liệu thực, ví dụ “4/5 người dùng qua ngưỡng”.
6. Nút `Tiếp theo` dẫn sang bước có phụ thuộc kế tiếp.

Chi tiết công thức, notation và substitution nằm trong `Xem sâu hơn`; không render mở mặc định.

## 5. Thiết kế thành phần cụ thể

### 5.1. Điều hướng và stepper

- Giữ 8 bước về logic, nhưng thẻ stepper chỉ hiện số, tên ngắn và trạng thái.
- Bỏ tag công thức khỏi mặt trước của thẻ. Đặt danh sách equation ở tooltip hoặc dòng subtitle của nội dung bước.
- Đặt progress label, ví dụ `Bước 4 / 7 · Độ tương đồng`.
- Trong Guided mode: chỉ cho click bước đã hoàn thành; bước kế tiếp dùng nút `Tiếp theo` rõ ràng.
- Trong Result mode: thu gọn stepper thành nút `Khám phá cách tính` mở lộ trình 7 bước.

### 5.2. Context bar

- Giữ số candidate và policy POI mới vì chúng là thông tin quan trọng.
- Chuyển thành viên nhóm, Train/Test count và theta sang popover “Bối cảnh phiên chạy” trên viewport hẹp.
- Không hiển thị timestamp/metadata chi tiết trong context bar; chỉ hiển thị ở Bước 0 hoặc audit.

### 5.3. Formula card

- Mặc định chỉ hiển thị một công thức trung tâm cho mỗi bước.
- Với Bước 4, dùng tab cục bộ: `Feature`, `Check-in`, `Kết hợp & ngưỡng`; không đặt Eq. (10)-(13) trên một dòng.
- Notation registry dùng accordion; chỉ mở mặc định ở Guided mode lần đầu của bước.
- Dùng `InlineMath`/`MathLabel` cho toàn bộ ký hiệu, gồm tiêu đề cột, mô tả, tooltip và empty state.

### 5.4. Trace inspector

- Mặc định đóng trong cả Result mode và Guided mode.
- Khi mở, desktop dùng side panel 360-400px; mobile dùng bottom sheet có nút đóng rõ ràng.
- Cùng lúc chỉ giữ một trace được chọn; hàng/ô nguồn có outline và `aria-selected`.
- Khi chuyển bước hoặc thay đổi dataset, đóng trace thay vì giữ thông tin có nguy cơ lạc ngữ cảnh.

### 5.5. Bước 7 và candidate audit

- Top-N cards dùng headline là tên POI, score cuối và một lý do ngắn “POI mới với tất cả thành viên”.
- Hiển thị formula breakdown chỉ cho POI đang chọn, không lặp trên mọi card.
- Ranking table và audit table nằm trong accordion/tab; bảng audit có summary `3 hợp lệ · 3 đã loại` ngay tiêu đề.
- POI bị loại phải giữ lý do audit nhưng không có rank hoặc màu cạnh tranh với Top-N.

### 5.6. Đồ họa luồng thuật toán

Thêm một `PipelineMap` nhỏ trong Guided mode:

```text
Train check-ins
  -> User features
  -> Group feature
  -> Similar neighbors
  -> Eligible new POIs
  -> CF score + divergence
  -> Top-N
```

- Chỉ node hiện hành và node kế tiếp được nhấn mạnh.
- Node là button có thể điều hướng tới step đã hoàn thành.
- Không biến thành dashboard hoặc sơ đồ lớn; mục tiêu là định vị người học.

## 6. Kế hoạch animation

### 6.1. Animation nên triển khai

| Tình huống | Motion | Thời lượng | Mục đích |
| --- | --- | --- | --- |
| Chuyển step | opacity `0 -> 1`, translateY `6px -> 0` | 180ms | Cho người dùng biết vùng nội dung đã đổi |
| Bước vừa hoàn thành | border/color transition và check icon fade | 160ms | Xác nhận tiến độ mà không gây nhiễu |
| Chọn POI/ô bảng | selected outline + trace panel opacity/translate | 160-180ms | Liên kết dữ liệu nguồn với phép tính |
| Expand accordion | height/opacity nhẹ | 160ms | Giữ vị trí đọc ổn định |
| Đổi policy POI mới/tất cả | candidate count cross-fade + toast ngắn | 180ms | Giải thích kết quả bị thay đổi bởi policy |
| Invalidate sau chỉnh dữ liệu | banner “Kết quả cần chạy lại” fade-in | 160ms | Tránh cảm giác kết quả tự biến mất |

### 6.2. Animation không nên triển khai

- Không stagger từng ô ma trận hoặc hàng ranking.
- Không count-up mọi score; chỉ dùng nếu người dùng mở breakdown của một POI.
- Không lặp pulse cho CTA, badge, status hay indicator.
- Không dùng waiting animation cho `Chạy toàn bộ` vì pipeline hiện chạy tức thời.
- Không animate layout bằng thuộc tính tốn layout như `width`, `height` trên bảng lớn nếu có thể dùng `opacity` và `transform`.

### 6.3. Quy ước CSS

```css
:root {
  --motion-fast: 160ms;
  --motion-standard: 180ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

- Thay toàn bộ `transition: all` bằng danh sách thuộc tính cụ thể, ví dụ `transition: opacity var(--motion-fast) var(--ease-standard), transform var(--motion-fast) var(--ease-standard)`.
- Không làm dịch chuyển cấu trúc khiến con trỏ/keyboard focus mất vị trí.

## 7. Hiệu năng và kỹ thuật triển khai

### 7.1. Code-splitting

Lazy-load các phần không cần cho Result mode đầu tiên:

- `Step0Dataset` và các step bảng lớn.
- `CandidateAuditTable`.
- Modal ghi chú paper.
- Formula/trace panel giàu KaTeX.

Giữ shell ứng dụng, context summary và Top-N cards trong entry chunk. Dùng fallback skeleton nhỏ, không dùng spinner toàn trang.

### 7.2. Tối ưu render

- Memo hóa dataset-derived rows/cells cho MatrixTable và audit table.
- Không tạo toàn bộ bảng Step 1-6 khi đang ở Result mode.
- Chỉ render trace được chọn, không pre-render trace cho mọi cell.
- Khi dataset lớn, cân nhắc virtualize tables; với dataset demo hiện tại chưa cần thêm dependency.

### 7.3. Responsive và accessibility

- Kiểm tra 375px, 768px, 1024px, 1440px.
- Không cho page-level horizontal overflow; chỉ bảng có thể cuộn trong wrapper cục bộ.
- Trace chuyển từ side panel thành bottom sheet dưới 1100px.
- Touch target tối thiểu 44px ở mobile.
- Accordion, tabs, stepper và selection phải dùng semantic button, state `aria-expanded`/`aria-selected`, keyboard focus rõ ràng.
- Dynamic summary dùng `aria-live="polite"`; không thông báo mọi animation hoặc every score update.

## 8. Lộ trình triển khai

### Pha 1 - Giảm tải nhận thức (ưu tiên cao)

1. Thêm `AppMode = 'result' | 'guided' | 'configure'`.
2. Tạo entry chooser và default Result mode.
3. Thu gọn Stepper theo mode.
4. Chuyển RankingTable và CandidateAuditTable vào accordion đóng mặc định.
5. Đặt TraceInspector đóng mặc định và chỉ mở theo thao tác chọn.

**Kết quả cần thấy:** màn Result mode đầu tiên chỉ tập trung vào Top-N, không có bảng audit mở sẵn.

### Pha 2 - Luồng học từng bước (ưu tiên cao)

1. Tạo `GuidedStepLayout` dùng chung cho Step 1-7.
2. Chuẩn hóa cấu trúc Why/Input/Formula/Output/Conclusion.
3. Thêm `PipelineMap` thu gọn.
4. Thêm `Tiếp theo`, `Quay lại`, và recap output của bước trước.

**Kết quả cần thấy:** người mới có thể đi từ Bước 1 đến 7 mà không phải đoán thao tác tiếp theo.

### Pha 3 - Motion và feedback (ưu tiên trung bình)

1. Định nghĩa token motion và `prefers-reduced-motion`.
2. Thêm step transition, selection/trace motion, accordion motion, invalidation banner.
3. Loại `transition: all` khỏi CSS hiện có.
4. QA keyboard focus trong lúc panel/accordion chuyển trạng thái.

**Kết quả cần thấy:** thay đổi ngữ cảnh rõ ràng nhưng không có chuyển động lặp hoặc gây chậm.

### Pha 4 - Hiệu năng và QA (ưu tiên trung bình)

1. React lazy import các màn ít dùng.
2. Đo bundle và lần tải đầu trước/sau split.
3. Browser QA responsive + reduced motion.
4. Thêm test component cho mode, accordion, trace reset và candidate policy switch.

**Kết quả cần thấy:** Result mode mở nhanh, không tràn layout, và nội dung vẫn dùng được khi tắt motion.

## 9. File dự kiến thay đổi

| File | Hướng thay đổi |
| --- | --- |
| `src/App.tsx` | Quản lý app mode, lazy route/view và state chuyển mode |
| `src/components/AlgorithmStepper.tsx` | Stepper rút gọn theo Guided/Result mode |
| `src/components/RunContextBar.tsx` | Context bar responsive, metadata chi tiết trong popover |
| `src/components/TraceInspector.tsx` | Default closed, side panel/bottom sheet responsive |
| `src/components/RankingTable.tsx` | Result-first summary và full ranking accordion |
| `src/components/CandidateAuditTable.tsx` | Audit accordion với summary |
| `src/components/FormulaCard.tsx` | Một công thức chính, details theo tab/accordion |
| `src/components/PipelineMap.tsx` | Mới: sơ đồ luồng Guided mode |
| `src/components/GuidedStepLayout.tsx` | Mới: khung Why/Input/Formula/Output/Conclusion |
| `src/index.css` | Token motion, reduced-motion, responsive layout, loại `transition: all` |
| `src/tests/*` | Mode/state, trace reset, accessibility và regression UI |

## 10. Tiêu chí nghiệm thu

### Result mode

- Người dùng nhìn thấy Top-N POI mới, số candidate và lý do chính trong viewport đầu tiên.
- Ranking đầy đủ, audit và trace không mở mặc định.
- Có thể mở một phép tính chi tiết trong tối đa hai thao tác.

### Guided mode

- Mỗi bước có một output chính và câu kết luận cụ thể.
- Có đường đi rõ ràng tới bước tiếp theo.
- Không có chuỗi ký hiệu toán học hiển thị thô với underscore/subscript sai.

### Motion và accessibility

- Không có `transition: all` trong stylesheet sản phẩm.
- `prefers-reduced-motion` làm mọi transition/animation gần như tức thời.
- Focus không mất khi đổi step, mở trace hoặc accordion.
- Không có page-level horizontal overflow ở 375px, 768px, 1024px, 1440px.

### Hiệu năng

- Result mode không tải trước audit table và step module không cần thiết.
- Bundle entry giảm có đo lường; không chấp nhận code-splitting chỉ để đổi tên chunk.
- Không dùng spinner toàn trang cho các phép tính đồng bộ ngắn.

