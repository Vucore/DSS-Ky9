# Walkthrough: Interactive CFID Algorithm Visualizer

We have successfully designed, built, and verified the interactive web-based **CFID (Collaborative Filtering with Intragroup Divergence)** Algorithm Visualizer, directly derived from the research paper:
> *"A Collaborative Filtering Algorithm with Intragroup Divergence for POI Group Recommendation"* (Appl. Sci. 2021, 11, 5416).

---

## 1. Mathematical Pipeline & Paper Equations

The application implements the complete end-to-end CFID recommendation pipeline based on **Algorithm 1**:

| Step | Paper Section | Equations | Implemented Mechanism |
|---|---|---|---|
| **Step 0** | Sec 3.1 & Table 1 | Table 1 | **Input Dataset & Parameters**: Users $U$, candidate POIs $L$, categories $C$, check-in matrix $R$, timestamps, target group $g$, friend sets $A_u$, $\theta$, $\alpha$, and Top-$N$. |
| **Step 1** | Sec 3.3 (1) | **Eq. (2), (3)** | **User Category Preference**: TF-IDF inspired preference $p_{u, c}$ weighting user category check-in frequency by catalog rarity. Constructs $M_u^C$. |
| **Step 2** | Sec 3.3 (2) | **Eq. (4), (5), (6)** | **User Time Preference**: 4 diurnal time slots ($T_1..T_4$) and weekend ratio ($T_5$), forming $M_u^T$, concatenated into user feature vector $M_u = (M_u^C, M_u^T)$. |
| **Step 3** | Sec 3.4 | **Eq. (7), (8), (9)** | **Group Preference Model**: Member affinity factor $\eta_u^g = \frac{|L_u \cap L_{u, g}|}{|L_u|}$, weighted aggregation into virtual group feature vector $M_g$. |
| **Step 4** | Sec 3.5 (1, 2, 3) | **Eq. (10), (11), (12), (13)** | **Group/User Similarity**: Feature cosine similarity $\operatorname{sim}^m_{g,v}$, check-in similarity $\operatorname{sim}^u_{g,v}$, combined similarity $\operatorname{sim}_{g,v}$, and filtering threshold $\theta$. |
| **Step 5** | Sec 3.5 (3) | **Eq. (14)** | **Collaborative Filtering**: Consensus score $f_{g,l} = \frac{\sum \operatorname{sim}_{g,v} \times r_{v,l}}{\sum \operatorname{sim}_{g,v}}$ over users meeting threshold $\theta$. |
| **Step 6** | Sec 3.5 (4) | **Eq. (15), (16)** | **Intragroup Divergence**: Member POI probability $\delta(u,l)$ based on friends $A_u$, and pairwise divergence $d_{g,l} = \frac{2}{n(n-1)} \sum |\delta(u,l) - \delta(u',l)|$. |
| **Step 7** | Sec 3.5 (4), Alg 1 | **Eq. (17)** | **Final CFID Ranking**: $f'_{g,l} = \alpha f_{g,l} - (1 - \alpha) d_{g,l}$, sorted descending for Top-$N$ POIs. |

---

## 2. Mathematical Ambiguities & Documented Decisions

1. **Equation (12) (Combination vs. Normalization)**:
   - **Text**: *"we normalize the sum of the two and get the similarity between g and v"*
   - **Printed Eq. (12)**: $\operatorname{sim}_{g,v} = \operatorname{sim}^m_{g,v} + \operatorname{sim}^u_{g,v} \in [0, 2]$.
   - **Resolution**: Implemented **Paper-Faithful sum mode** as the default, with a toggle for **Normalized Average mode** ($\frac{\operatorname{sim}^m + \operatorname{sim}^u}{2} \in [0, 1]$), clearly marked in the UI and documentation modal.
2. **Equation (11) (Typographical Error in Paper)**:
   - Paper prints $\sqrt{\sum_{k=1}^m (r_{u, ll})^2}$. Corrected to standard cosine denominator $\sqrt{\sum_{k=1}^m (r_{u, l_k})^2}$.
3. **Equation (16) (Friend Sets $A_u$)**:
   - Explicitly provided in the mock dataset without inventing unverified social graph crawl heuristics.
4. **Equations (7) & (14) (Zero-Division Safeguards)**:
   - If group members share no historical POIs ($\sum \eta_u^g = 0$), uniform weights $\eta_u^g = 1/|g|$ are applied.
   - If no users pass threshold $\theta$, collaborative filtering score $f_{g,l} = 0$.

---

## 3. Deterministic Mock Dataset Results

The mock dataset consists of 5 users ($U = \{u_1, u_2, u_3, u_4, u_5\}$), target group $g = \{u_1, u_2, u_3\}$, and 6 candidate POIs ($l_1$: Blue Bottle Coffee, $l_2$: Central Park, $l_3$: Joe's Pizza, $l_4$: Skyline Rooftop Bar, $l_5$: Modern Art Museum, $l_6$: Sports & Bowling Complex).

### Step 7: Final Recommendation Score ($f'_{g,l} = 0.7 f_{g,l} - 0.3 d_{g,l}$, Top-$k = 3$)
| Rank | POI Name | Category | CF Score $f_{g,l}$ | Divergence $d_{g,l}$ | Final Score $f'_{g,l}$ | Status |
|---|---|---|---|---|---|---|
| **#1** | **Cà phê Blue Bottle ($l_1$)** | Quán cà phê | 1.0000 | 0.0000 | **0.7000** | Top-1 (Nhóm đã đi) |
| **#2** | **Quán Bar Skyline Rooftop ($l_4$)** | Quán bar | 0.2956 | 0.0000 | **0.2069** | **Top-2 (Địa điểm mới nhóm chưa từng đi!)** |
| **#3** | **Nhà hàng Pizza Joe ($l_3$)** | Nhà hàng | 0.2281 | 0.3333 | **0.0597** | Top-3 (Nhóm đã đi) |
| **#4** | **Công viên Trung tâm ($l_2$)** | Công viên | 0.2281 | 0.3333 | **0.0596** | Rank #4 (Nhóm đã đi, phạt bất đồng) |
| **#5** | **Bảo tàng Nghệ thuật ($l_5$)** | Bảo tàng | 0.1497 | 0.3333 | **0.0048** | Rank #5 (Địa điểm mới) |
| **#6** | **Tổ hợp Bowling ($l_6$)** | Thể thao | 0.0000 | 0.0000 | **0.0000** | Rank #6 (Địa điểm mới) |

---

## 4. Automated Test Verification

All 8 test suites and 18 unit/integration tests pass with 100% coverage of all algorithm steps:

```bash
✓ src/tests/categoryPreference.test.ts (2 tests)
✓ src/tests/timePreference.test.ts (2 tests)
✓ src/tests/groupPreference.test.ts (2 tests)
✓ src/tests/similarity.test.ts (3 tests)
✓ src/tests/collaborativeFiltering.test.ts (2 tests)
✓ src/tests/divergence.test.ts (2 tests)
✓ src/tests/finalScore.test.ts (1 test)
✓ src/tests/pipeline.test.ts (4 tests)

Test Files  8 passed (8)
     Tests  18 passed (18)
```

---

## 5. How to Run Locally

To start the visualizer locally:
```bash
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your web browser.

To run the automated tests:
```bash
npm test
```

---

## 6. Calculation Trace & Enlarged Hover Card Feature

- **Floating Hover Card (`TraceHoverCard`)**:
  - **Generous Dimensions**: Width enlarged to **620px** (responsive `min(620px, calc(100vw - 32px))`) with `padding: 16px 20px` to comfortably accommodate long fractions, summations, and substituted arithmetic equations without clipping.
  - **Dual Section Layout**:
    1. **📐 Công thức toán học nguyên bản**: KaTeX display mode rendering the theoretical paper formula (e.g., TF-IDF $p_{u,c}$, Cosine Similarity $\operatorname{sim}^m_{g,v}$, CF consensus $f_{g,l}$, Divergence $d_{g,l}$, Final score $f'_{g,l}$).
    2. **🔢 Biểu thức thay số chi tiết**: KaTeX display mode rendering the exact arithmetic expression with all variables substituted by numbers (e.g. $p_{u_1, c_1} = (10/25) \times \ln(6/2) = 0.4000 \times 1.0986 = 0.4394$).
    3. **📌 Nguồn gốc các con số**: Chi tiết từng ký hiệu toán học ($r_{u,c}$, $\sum r$, $\alpha$, $\operatorname{sim}$, v.v.), giá trị cụ thể, và lý giải rõ ràng con số đó lấy từ bảng nào hoặc bước tính toán nào.
    4. **Giá trị kết quả tính toán**: Highlighted emerald badge with 4-decimal precision ($0.4394$).
  - **Cursor Anchoring & Viewport Clamping**: Anchored dynamically at the mouse coordinates, flips to top/left when near screen edges, with `pointer-events: none` to prevent mouse event stealing and unhover flickering.
  - **Persistent Click Drawer (`TraceInspector`)**: Clicking any table cell or button keeps open the deep-dive right-side inspector with identical number origins explanation, full KaTeX formulas, and zero unnecessary numerator/denominator clutter.

