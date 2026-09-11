# Kế hoạch cải thiện UI CFID và đề xuất POI mới

## 1. Mục tiêu

Nâng cấp ứng dụng từ một bảng mô phỏng đầy đủ số liệu thành công cụ học thuật dễ theo dõi, trong đó người dùng có thể trả lời ngay ba câu hỏi:

1. Bước hiện tại đang tính gì và đầu ra của bước đó được dùng ở đâu?
2. Công thức hiển thị có đúng ký hiệu toán học của paper không?
3. POI được đề xuất có thực sự là POI mới với nhóm, và điểm số được tính chỉ từ dữ liệu lịch sử hay không?

Phạm vi giữ nguyên thuật toán CFID trong paper: các công thức (2) đến (17) không thay đổi. Thay đổi nằm ở cách biểu diễn ký hiệu, tổ chức UI, tách dữ liệu train/test, và giới hạn tập POI ứng viên.

## 2. Hiện trạng và nguyên nhân

| Vấn đề | Nguyên nhân kỹ thuật | Tác động |
| --- | --- | --- |
| Một số ký hiệu như `Mc_u`, `Mg`, `fg,l` xuất hiện như text thường | Nội dung mô tả, tiêu đề bảng và nhãn được ghép bằng chuỗi JSX; chỉ phần `MathView` được render qua KaTeX | Người đọc nhầm chỉ số dưới, chỉ số trên và biến vector |
| Một màn hình chứa quá nhiều bảng, chú giải và công thức | `App.tsx` render phần lớn nội dung của mỗi bước trong cùng một bố cục hai cột; formula, bảng và trace đều có trọng số thị giác gần như nhau | Khó biết nên đọc từ đâu và quan hệ giữa các bước |
| Trace ở panel phải có thể còn của bước trước | `selectedTrace` là state toàn cục; khi chỉ chuyển tab bước, state này không được thay thế hoặc xóa | Chi tiết Công thức (17) có thể xuất hiện khi đang xem Công thức (15)-(16) |
| Top-N hiện có thể chứa POI nhóm đã ghé | Xếp hạng chạy trên toàn bộ `pois`; chưa có tách train/test hay tập candidate | Không thể khẳng định đây là đề xuất POI mới |
| Chế độ tổng similarity và ngưỡng có thể gây hiểu nhầm | Paper mâu thuẫn giữa câu “normalize” và Eq. (12) là phép cộng; UI cho phép cả hai mode nhưng chưa diễn giải bằng tác động lên tập láng giềng | Người dùng khó hiểu vì sao người dùng ít tương đồng vẫn qua ngưỡng |

## 3. Quyết định sản phẩm và toán học

### 3.1. Quy ước ký hiệu

- Mọi biến toán học phải được render bởi KaTeX; không dùng text thô cho biến như `Mc_u`, `M_g`, `f_g,l`, `eta` hoặc `delta`.
- Chuẩn thống nhất: `M_u^C`, `M_u^T`, `M_u`, `M_g`, `\eta_u^g`, `\operatorname{sim}_{g,v}`, `f_{g,l}`, `d_{g,l}`, `f'_{g,l}`.
- Nội dung diễn giải tiếng Việt giữ ở text thường; chỉ đoạn ký hiệu được bọc bởi một component `InlineMath`.
- Tạo registry ký hiệu dùng chung, tránh mỗi component tự viết một phiên bản LaTeX khác nhau.

Ví dụ:

```tsx
<p>
  Ghép <InlineMath latex="M_u^C" /> và <InlineMath latex="M_u^T" />
  để tạo <InlineMath latex="M_u" />.
</p>
```

### 3.2. Đề xuất POI mới

Khái niệm “mới” được áp dụng theo lịch sử **train** của nhóm:

\[
L_{candidate}(g) = L \setminus \bigcup_{u \in g} L_u^{train}
\]

- Một POI bị loại nếu ít nhất một thành viên nhóm đã check-in POI đó trong train.
- Tất cả feature, similarity, CF score và divergence phải dùng duy nhất check-in train.
- Test set chỉ dùng để đánh giá sau khi đã tạo recommendation; tuyệt đối không đi vào Eq. (2)-(17).
- Eq. (17) không thay đổi. Điểm cho các POI được tính như cũ, sau đó chỉ xếp hạng `L_candidate(g)`.
- Cần giữ hai chính sách có chủ đích:
  - `new_for_group` - mặc định cho demo: chỉ đề xuất POI mới.
  - `all_pois` - chế độ minh họa công thức gốc, giữ khả năng so sánh với hành vi hiện tại.

### 3.3. Tách dữ liệu

Dùng time-based holdout thay vì random split để phản ánh dự đoán tương lai:

- `train`: check-in có timestamp trước `testStartAt`.
- `test`: check-in từ `testStartAt` trở đi.
- Không cho phép chạy `new_for_group` với split thời gian nếu check-in thiếu timestamp; UI phải nêu lỗi cấu hình thay vì tự chia ngẫu nhiên.
- Dữ liệu demo phải có ít nhất 2 POI chỉ được người dùng ngoài nhóm ghé trong train; nhờ đó luôn có POI mới để xếp hạng.

## 4. Thiết kế UI mục tiêu

### 4.1. Khung thông tin cố định

Trên stepper đặt một thanh “Bối cảnh phiên chạy” gọn, luôn thấy được:

- Nhóm mục tiêu và danh sách thành viên.
- Chế độ recommendation: `POI mới` hoặc `Tất cả POI`.
- Khoảng thời gian train/test và số check-in tương ứng.
- `|L|`, số POI bị loại vì đã biết, và số POI ứng viên còn lại.
- Mode similarity và ngưỡng theta hiện hành.

Thông tin này thay thế việc buộc người dùng phải quay lại Bước 0 để hiểu kết quả của Bước 7.

### 4.2. Luồng đọc của một bước

Mỗi bước có thứ tự nhất quán:

1. **Mục đích** - một câu: đầu vào nào được biến đổi thành đầu ra nào.
2. **Công thức chính** - chỉ công thức đang cần dùng; các công thức phụ nằm trong accordion “Xem chi tiết”.
3. **Dữ liệu/bảng kết quả** - bảng duy nhất làm trung tâm của bước.
4. **Kết luận bước** - ví dụ “4/5 người dùng qua ngưỡng” hoặc “còn 2 POI mới”.
5. **Chi tiết phép tính** - drawer bên phải trên desktop, bottom sheet trên mobile; chỉ hiển thị khi người dùng chọn một ô/dòng.

`selectedTrace` phải gắn `stepId` và `entityId`. Khi chuyển bước, nếu trace không thuộc bước mới thì xóa nó và hiển thị empty state: “Chọn một giá trị trong bảng để xem phép thay số.”

### 4.3. Công thức và ký hiệu

- Tách `FormulaCard` thành `StepIntroduction`, `EquationPanel`, `NotationDrawer`.
- Với bước có nhiều công thức, dùng tabs/accordion: ví dụ Bước 4 gồm “Feature cosine (10)”, “Check-in cosine (11)”, “Kết hợp & ngưỡng (12-13)”. Không đặt cả ba trên cùng một dòng dài.
- `MathView` bổ sung chế độ phát triển: báo warning khi KaTeX không parse được, thay vì im lặng fallback về text thô.
- Trace hiển thị biểu thức số học ở font mono, nhưng tên biến và công thức nguồn luôn là KaTeX.
- Dùng một component `MathLabel` cho tiêu đề cột, badge và tooltip để ngăn regression như `M_c`.

### 4.4. Bảng và xếp hạng cuối

Bước 7 có ba vùng rõ ràng:

1. **Top-N POI mới**: card lớn, chỉ POI đủ điều kiện, kèm score cuối và lý do “mới với tất cả thành viên”.
2. **Phân rã điểm cho POI đang chọn**: `alpha × f_{g,l}` trừ `(1-alpha) × d_{g,l}`, bằng số và thanh tỷ lệ. Không dùng thanh tỷ lệ nếu final score âm hoặc thang không rõ ràng.
3. **Audit candidate**: bảng mở rộng gồm POI đủ điều kiện và POI bị loại. POI bị loại hiển thị tên thành viên đã ghé và thời điểm check-in train; không gán thứ hạng Top-N.

Các bảng rộng phải nằm trong `.table-scroll-wrapper`; grid item trái đặt `min-width: 0` để không ép tràn toàn trang khi panel trace 420px còn mở. Ở chiều rộng dưới 1100px, trace xuống dưới bảng; dưới 768px, stepper còn 2 cột và các cột bảng có nhãn ngắn.

### 4.5. Bước 4: làm rõ mơ hồ Eq. (12)

Thay callout dài bằng card “Quy ước đang dùng”:

- `Bám theo công thức in`: `sim^m + sim^u`, range `[0, 2]`.
- `Chuẩn hóa trung bình`: `(sim^m + sim^u) / 2`, range `[0, 1]`.
- Khi đổi mode, hiển thị theta tương ứng; đề xuất nhân đôi theta nếu người dùng chuyển từ normalized sang sum.
- Bảng kết quả có cột “Qua ngưỡng / bị loại” và summary số láng giềng để hệ quả của mode nhìn thấy ngay.

## 5. Thiết kế dữ liệu và thuật toán

### 5.1. Các type mới

Thêm vào `src/domain/types.ts`:

```ts
type RecommendationPolicy = 'new_for_group' | 'all_pois';

interface TemporalSplitConfig {
  kind: 'temporal';
  testStartAt: string; // ISO-8601, required
}

interface RecommendationConfig {
  policy: RecommendationPolicy;
  split: TemporalSplitConfig;
}

interface PreparedDataset {
  trainCheckIns: CheckInEvent[];
  testCheckIns: CheckInEvent[];
}

interface CandidatePOI {
  poiId: string;
  eligible: boolean;
  exclusionReason?: 'seen_by_group_in_train';
  seenByMemberIds: string[];
  seenCheckIns: CheckInEvent[];
}
```

`Dataset` giữ danh sách check-in gốc và thêm `recommendationConfig`. `PreparedDataset` là kết quả tách dữ liệu, không được sửa dữ liệu gốc.

### 5.2. Luồng xử lý mới

```text
raw check-ins
  -> temporal split
  -> trainCheckIns --------------------> Eq. (2) ... Eq. (16)
  -> candidate builder (seen POIs of g) -> eligible POIs
  -> Eq. (17), giữ eligible POIs         -> Top-N mới
  -> testCheckIns (chỉ tại evaluation)   -> Precision@N / Recall@N
```

Thứ tự cụ thể:

1. `prepareDataset(dataset)` kiểm tra timestamp và tạo `{ trainCheckIns, testCheckIns }`.
2. Các hàm Step 1-6 nhận training view của dataset, không nhận `testCheckIns`.
3. `buildCandidatePOIs(trainCheckIns, group, policy)` tạo audit đầy đủ cho từng POI.
4. `computeFinalRanking` vẫn tính Eq. (17), sau đó chỉ sắp xếp candidate đủ điều kiện khi policy là `new_for_group`.
5. `Step7Output` bổ sung `excludedPois`, `candidateCount`, `allScoredPois`; `rankings` và `topN` chỉ là POI đủ điều kiện.
6. Giai đoạn sau có thể thêm `evaluateRecommendations(topN, testCheckIns, group)` để tính Precision@N/Recall@N đúng paper. Không đưa metric vào luồng tính điểm.

### 5.3. Quy tắc về self-neighbor

Vì paper dùng diễn đạt “other users” nhưng Eq. (14) viết `v in U`, cần đưa đây thành cài đặt minh bạch, không ngầm quyết định:

- Mặc định được đề xuất: loại thành viên nhóm khỏi tập láng giềng CF (`v notin g`) để tránh self-vote.
- Có toggle “Bao gồm thành viên nhóm - mô phỏng Eq. (14) theo U đầy đủ” để so sánh học thuật.
- Audit CF phải liệt kê rõ các neighbor đóng góp cho mỗi score.

## 6. Hạng mục triển khai theo pha

### Pha A - Nền tảng ký hiệu và trace

1. Tạo `InlineMath`, `MathLabel`, `notationRegistry.ts`.
2. Thay mọi biến math trong `App.tsx`, `FormulaCard.tsx`, `InputTable.tsx`, bảng kết quả và tooltips bằng component mới.
3. Tách `selectedTrace` thành `{ stepId, entityId, trace, label }`; reset trace khi active step khác step trace.
4. Viết test render cho các ký hiệu trọng yếu: `M_u^C`, `M_g`, `f_{g,l}`, `d_{g,l}`, `f'_{g,l}`; không được có underscore hiển thị như text.

### Pha B - Tái tổ chức giao diện

1. Tách phần render từng bước trong `App.tsx` thành `src/features/steps/Step0...Step7`.
2. Thêm `RunContextBar`, `StepSummary`, `TraceInspector` và empty state có hướng dẫn.
3. Tái thiết kế `FormulaCard` thành accordion công thức, ký hiệu và giả định.
4. Sửa responsive CSS: `min-width: 0` cho grid items, table-local scroll, panel trace đặt dưới nội dung ở breakpoint, kiểm tra 1440px / 1024px / 768px / 375px.
5. Chỉ giữ heatmap nơi màu biểu đạt được ý nghĩa; không tô màu nhiều bảng chỉ vì thống nhất style.

### Pha C - Dữ liệu train/test và POI mới

1. Thêm config và validator timestamp vào domain/input UI.
2. Tạo `src/algorithm/dataSplit.ts` và `src/algorithm/candidates.ts`.
3. Chuyển Step 1-6 sang dùng `trainCheckIns` thông qua một training dataset view.
4. Cập nhật `computeFinalRanking` và `Step7Output` cho candidate audit.
5. Cập nhật dataset demo: có POI mới, POI đã biết và event test để minh họa cả ba trạng thái.
6. Bổ sung UI lựa chọn policy, summary candidate và bảng POI bị loại ở Bước 7.

### Pha D - Kiểm thử, accessibility và QA

1. Unit test temporal split, candidate eligibility, self-neighbor policy và test-data leakage.
2. Integration test: `new_for_group` không có POI đã ghé trong `topN`; `all_pois` tái tạo thứ hạng hiện tại.
3. Test rendering component bảo đảm ký hiệu KaTeX có semantic output và mô tả tiếng Việt vẫn dễ đọc.
4. Browser QA đầy đủ: chạy toàn pipeline, đổi mode similarity, đổi policy POI, chọn cell để mở trace, chuyển bước, và kiểm tra resize.
5. Kiểm tra keyboard focus, aria-label cho icon-only control, contrast, tooltip cho ký hiệu và không có horizontal page overflow.

## 7. Danh sách file dự kiến

| File | Thay đổi |
| --- | --- |
| `src/domain/types.ts` | Recommendation config, split, candidate audit và output Step 7 |
| `src/algorithm/dataSplit.ts` | Tách train/test theo thời gian, validate dữ liệu |
| `src/algorithm/candidates.ts` | Xác định POI mới và lý do loại |
| `src/algorithm/pipeline.ts` | Chuẩn bị training view trước khi chạy các bước |
| `src/algorithm/finalScore.ts` | Lọc candidate sau Eq. (17), trả audit |
| `src/algorithm/similarity.ts` | Chính sách self-neighbor minh bạch |
| `src/data/mockDataset.ts` | Demo có candidate mới và test holdout |
| `src/components/MathView.tsx` | Render/diagnostic KaTeX đáng tin cậy |
| `src/components/FormulaCard.tsx` | Formula accordion và notation registry |
| `src/components/TraceInspector.tsx` | Thay panel trace state cũ |
| `src/components/CandidateAuditTable.tsx` | Danh sách POI hợp lệ/bị loại |
| `src/components/RunContextBar.tsx` | Bối cảnh train/test, nhóm và candidate |
| `src/App.tsx` | Chỉ điều phối state và từng step feature |
| `src/index.css` | Hierarchy, responsive grid, scroll containment |
| `src/tests/*` | Test thuật toán mới, UI state và regression |

## 8. Tiêu chí nghiệm thu

### Toán học và dữ liệu

- Không có check-in test nào được dùng để tạo feature, similarity, CF score hoặc divergence.
- Với `new_for_group`, mỗi POI Top-N không có check-in train của bất kỳ thành viên nhóm nào.
- Eq. (2)-(17) giữ nguyên; test số học của phiên bản hiện có vẫn qua trong mode `all_pois`.
- Mỗi POI loại trừ có audit được: thành viên nào, check-in train nào, lý do gì.

### Giao diện

- Không còn ký hiệu toán học hiển thị dưới dạng chuỗi có `_`, ví dụ `Mc_u`.
- Mỗi màn chỉ có một trọng tâm; công thức phụ và chú giải dài không che bảng chính.
- Chuyển bước không còn hiển thị trace của công thức khác.
- Ở 375px, 768px, 1024px và 1440px không có tràn ngang toàn trang; bảng được phép cuộn ngang bên trong chính bảng.
- Người dùng nhận biết được trong dưới 10 giây: nhóm nào, policy nào, có bao nhiêu POI mới, và POI Top-1 được tạo bởi các thành phần điểm nào.

## 9. Rủi ro và cách xử lý

- **Timestamp thiếu hoặc không tin cậy:** chặn temporal split, hướng dẫn người dùng bổ sung timestamp; không tự tạo split ngẫu nhiên.
- **Không còn candidate sau lọc:** hiển thị empty state, số POI bị loại và lựa chọn chuyển sang `all_pois`; không trả danh sách cũ như thể là POI mới.
- **Demo mới làm thay đổi giá trị IDF hiện có:** cập nhật expected values của test có kiểm soát hoặc dùng fixture riêng cho scenario POI mới; không sửa assertion để “cho qua”.
- **Mơ hồ Eq. (12):** giữ cả hai mode, gắn nhãn rõ ràng và không khẳng định một mode là kết quả duy nhất của paper.

