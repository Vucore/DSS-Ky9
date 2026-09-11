# Implementation Plan: Interactive Web-based CFID Algorithm Visualizer

## Overview
This project implements an interactive web-based visualizer for the **CFID** (Collaborative Filtering with Intragroup Divergence) algorithm for POI (Point of Interest) group recommendation, based on the research paper:
> *"A Collaborative Filtering Algorithm with Intragroup Divergence for POI Group Recommendation"* (Appl. Sci. 2021, 11, 5416).

The system executes the algorithm deterministically step-by-step (Steps 0–7) based on **Algorithm 1**, showing for each step:
1. Formal paper equation with equation numbers (Equations 1–17).
2. Explicit inputs & dependencies.
3. Substituted numeric calculation with step-by-step arithmetic (numerators, denominators, log values, norms).
4. Intermediate values & matrices.
5. Deterministic outputs.

Users can run individual steps ("Run Step"), run the entire pipeline ("Run All"), reset state ("Reset"), load predefined demo datasets ("Load Demo"), edit parameters or inputs (which automatically invalidates dependent downstream steps), and inspect previous step outputs.

---

## 1. Mathematical Analysis & Equations in CFID

| Step | Paper Section | Equations | Purpose & Output |
|---|---|---|---|
| **Step 0** | Sec 3.1, 4.1 | Table 1 | **Input Dataset**: Users $U$, POIs $L$, Categories $C$, check-in events, timestamps, target group $g$, friend sets $A_u$, parameters $\theta$, $\alpha$, Top-$N$. |
| **Step 1** | Sec 3.3 (1) | **Eq (2), (3)** | **User Category Preference**: TF-IDF inspired preference $p_{u, c}$ of each user $u$ for each category $c$, forming $M_u^C$. |
| **Step 2** | Sec 3.3 (2) | **Eq (4), (5), (6)** | **User Time Preference**: Time-of-day slots ($T_1..T_4$) and weekend ratio ($T_5$), forming $M_u^T$ and concatenated user feature vector $M_u = (M_u^C, M_u^T)$. |
| **Step 3** | Sec 3.4 | **Eq (7), (8), (9)** | **Group Preference Model**: Member affinity $\eta_u^g$, weighted aggregation of member vectors into group feature vector $M_g$. |
| **Step 4** | Sec 3.5 (1,2) | **Eq (10), (11), (12), (13)** | **Group/User Similarity**: Feature cosine similarity $\operatorname{sim}^m_{g,v}$, check-in similarity $\operatorname{sim}^u_{g,v}$, combined similarity $\operatorname{sim}_{g,v}$, and thresholding with $\theta$. |
| **Step 5** | Sec 3.5 (3) | **Eq (14)** | **Collaborative Filtering**: Group POI score $f_{g,l}$ via user-based CF over similar users passing threshold $\theta$. |
| **Step 6** | Sec 3.5 (4) | **Eq (15), (16)** | **Intragroup Divergence**: Member POI probability $\delta(u,l)$ based on friends $A_u$, and pairwise divergence $d_{g,l}$ across all member pairs in $g$. |
| **Step 7** | Sec 3.5 (4), Alg 1 | **Eq (17)** | **Final CFID Ranking**: Final score $f'_{g,l} = \alpha f_{g,l} - (1-\alpha) d_{g,l}$, descending sort, and Top-$N$ POIs. |

---

## 2. Mathematical Ambiguities & Documented Assumptions

The paper contains several specific mathematical and notation details that require precise documentation:

### Ambiguity 1: Equation (12) Combination vs. Normalization
- **Paper Text (p. 8)**: *"Furthermore, we normalize the sum of the two and get the similarity between $g$ and $v$. In summary, the preference similarity between group $g$ and any user $v$ is as follows: $\operatorname{sim}_{g,v} = \operatorname{sim}^m_{g,v} + \operatorname{sim}^u_{g,v}$ (12)"*
- **The Issue**: The text explicitly mentions "normalize the sum of the two", but the printed equation is a raw sum ($\in [0, 2]$).
- **Solution & Paper-Faithful Mode**:
  - Default mode: **Paper-Faithful** following the printed Equation (12): $\operatorname{sim}_{g,v} = \operatorname{sim}^m_{g,v} + \operatorname{sim}^u_{g,v}$.
  - Provide a toggle in UI:
    1. *Paper-Faithful Sum*: $\operatorname{sim}_{g,v} = \operatorname{sim}^m_{g,v} + \operatorname{sim}^u_{g,v} \in [0, 2]$ (threshold $\theta \in [0, 2]$).
    2. *Normalized Average*: $\operatorname{sim}_{g,v} = \frac{\operatorname{sim}^m_{g,v} + \operatorname{sim}^u_{g,v}}{2} \in [0, 1]$ (threshold $\theta \in [0, 1]$).
  - The UI will explicitly highlight this ambiguity card with citations from Section 3.5 of the paper.

### Ambiguity 2: Typo in Equation (11) Denominator
- **Paper Printed (p. 8)**: $\sqrt{\sum_{l_k=1}^L (r_{u, l_l})^2}$. The index $l_l$ is a typographical error for $l_k$.
- **Correction**: Standard cosine denominator $\sqrt{\sum_{k=1}^m (r_{u, l_k})^2} \cdot \sqrt{\sum_{k=1}^m (r_{v, l_k})^2}$.

### Ambiguity 3: Logarithm Base in Equation (2)
- **Paper Formula**: $\log \frac{\sum_{k=1}^m \sum_{i=1}^{|C|} f_{l_k, c_i}}{\sum_{k=1}^m f_{l_k, c}}$.
- **Assumption**: Support Natural Log ($\ln$) and Common Log ($\log_{10}$), defaulting to $\ln$ (or $\log_{10}$) with explicit display of the base and computed float value.

### Ambiguity 4: Division by Zero in Affinity $\eta_u^g$ (Eq 7) & Collaborative Filtering (Eq 14)
- **Eq (7)**: If a user has 0 visits ($|L_u| = 0$) or if no group members share any POIs ($\sum_{u \in g} \eta_u^g = 0$), the formula denominator becomes zero.
  - *Fallback*: If $|L_u| = 0$, $\eta_u^g = 0$. If $\sum_{u \in g} \eta_u^g = 0$, fall back to uniform weights $\eta_u^g = 1 / |g|$.
- **Eq (14)**: If no user satisfies $\operatorname{sim}_{g,v} \ge \theta$, the denominator $\sum_v \operatorname{sim}_{g,v} = 0$.
  - *Fallback*: $f_{g,l} = 0$ for all $l$, and flag an informative banner: *"No user meets threshold $\theta$, CF score is 0"*.

### Ambiguity 5: Nature of $r_{v,l}$ in Check-in Matrices
- The paper introduces $R$ with visit frequencies $r_{u, l}$, but in the text following Eq (11) and Eq (16) specifies binary check-in indicators: *"If user $u$ has checked in at location $l$, $r_{u,l} = 1$. Otherwise, $r_{u,l} = 0$"*.
- In Eq (2), frequencies are explicitly used ($\sum r_{u, l_k} f_{l_k, c}$).
- *Design*: Maintain the raw check-in events, compute both the integer frequency matrix $R_{\text{freq}}$ (used in Eq 2) and the binary check-in matrix $R_{\text{bin}}$ (used in Eq 11, 14, 16).

### Ambiguity 6: Friend Set $A_u$ in Equation (16)
- As specified: *"For $A_u$ in Equation (16), do not invent a friend-discovery algorithm in the MVP. Provide explicit friend/similar-user sets in the mock input."*
- If $|A_u| = 0$, $\delta(u, l) = 0$.

---

## 3. Data Models (`src/domain/types.ts`)

```typescript
// Core Entities
export interface User {
  id: string;
  name: string;
}

export interface POI {
  id: string;
  name: string;
  categories: string[]; // POI can belong to one or more categories
  latitude?: number;
  longitude?: number;
}

export interface Category {
  id: string;
  name: string;
}

export type TimeSlot = 'T1' | 'T2' | 'T3' | 'T4'; // T1: 7-12, T2: 13-18, T3: 19-24, T4: 1-6

export interface CheckInEvent {
  id: string;
  userId: string;
  poiId: string;
  hour: number; // 0-23
  dayOfWeek: number; // 0: Sun, 1: Mon, ..., 6: Sat (0 & 6 = weekend)
  timestamp?: string;
}

export interface Group {
  id: string;
  name: string;
  memberUserIds: string[];
}

export interface Dataset {
  users: User[];
  pois: POI[];
  categories: Category[];
  checkIns: CheckInEvent[];
  groups: Group[];
  friendSets: Record<string, string[]>; // userId -> array of friend userIds (Au)
}

export interface Hyperparameters {
  theta: number; // Similarity threshold (Eq 13)
  alpha: number; // CF vs Intragroup divergence weight (Eq 17)
  topN: number;  // Number of recommendations
  logBase: 'ln' | 'log10' | 'log2';
  simMode: 'paper_sum' | 'normalized_avg';
}

// Calculation Explanation Metadata
export interface CalculationTraceMeta {
  formulaNumber: string; // e.g. "Eq. (2)"
  formulaLatex: string;
  expression: string;    // substituted string, e.g. "(3 / 5) * ln(4 / 1)"
  numerator?: number;
  denominator?: number;
  intermediateValues?: Record<string, number | string | number[]>;
  value: number;
}

// Step Output Interfaces
export interface Step1Output {
  // Category preferences per user
  preferences: Record<string, Record<string, CalculationTraceMeta>>; // userId -> catId -> trace
  vectors: Record<string, number[]>; // userId -> Mc_u
}

export interface Step2Output {
  timeSlots: Record<string, {
    slotCounts: Record<TimeSlot, number>;
    weekendCount: number;
    totalVisits: number;
    traces: Record<'T1'|'T2'|'T3'|'T4'|'T5', CalculationTraceMeta>;
  }>;
  userVectors: Record<string, {
    categoryPart: number[];
    timePart: number[];
    combinedMu: number[];
    featureNames: string[];
  }>;
}

export interface Step3Output {
  memberAffinities: Record<string, {
    Lu: string[];
    Lu_g: string[];
    intersection: string[];
    affinity: number;
    trace: CalculationTraceMeta;
  }>;
  groupVectorMg: {
    features: number[];
    featureNames: string[];
    traces: CalculationTraceMeta[];
  };
}

export interface Step4Output {
  similarities: Record<string, {
    simM: CalculationTraceMeta; // Eq 10 (Feature cosine)
    simU: CalculationTraceMeta; // Eq 11 (Check-in cosine)
    combinedSim: CalculationTraceMeta; // Eq 12
    passedThreshold: boolean;
    finalSim: number; // Eq 13 (0 if < theta)
  }>;
}

export interface Step5Output {
  cfScores: Record<string, {
    poiId: string;
    numerator: number;
    denominator: number;
    score: number;
    trace: CalculationTraceMeta;
    contributingUsers: { userId: string; sim: number; checkIn: number }[];
  }>;
}

export interface Step6Output {
  memberProbabilities: Record<string, Record<string, { // userId -> poiId
    delta: number;
    friendsVisited: string[];
    friendCount: number;
    trace: CalculationTraceMeta;
  }>>;
  pairwiseDifferences: Record<string, { // poiId
    pairs: { u1: string; u2: string; diff: number }[];
    divergence: number;
    trace: CalculationTraceMeta;
  }>;
}

export interface Step7Output {
  rankings: {
    rank: number;
    poi: POI;
    cfScore: number;
    divergence: number;
    finalScore: number;
    trace: CalculationTraceMeta;
  }[];
  topN: {
    rank: number;
    poi: POI;
    finalScore: number;
  }[];
}
```

---

## 4. Deterministic Mock Dataset Design

A small, hand-calculable dataset consisting of:
- **5 Users**: $U = \{u_1, u_2, u_3, u_4, u_5\}$
  - $u_1, u_2, u_3$ form target group $g$.
  - $u_4$ is an external user with high similarity to group $g$.
  - $u_5$ is an external user with distinct taste (low similarity).
- **4 POIs**: $L = \{l_1, l_2, l_3, l_4\}$
  - $l_1$: "Blue Bottle Coffee" ($c_1$: Coffee)
  - $l_2$: "Central Park" ($c_2$: Park)
  - $l_3$: "Joe's Pizza" ($c_3$: Restaurant)
  - $l_4$: "Skyline Rooftop Bar" ($c_4$: Bar)
- **4 Categories**: $C = \{c_1: \text{Coffee}, c_2: \text{Park}, c_3: \text{Restaurant}, c_4: \text{Bar}\}$
  - Clean 1-to-1 mapping: $\sum_{k=1}^m f_{l_k, c} = 1$, total tags = 4.
  - Category IDF: $\ln(4 / 1) = \ln(4) \approx 1.3863$.
- **Check-in Events**:
  - $u_1$: 4 check-ins:
    - $l_1$ (Wed 09:00, $T_1$, weekday)
    - $l_2$ (Sat 14:00, $T_2$, weekend)
    - $l_3$ (Thu 20:00, $T_3$, weekday)
    - $l_1$ (Sun 10:00, $T_1$, weekend)
  - $u_2$: 3 check-ins:
    - $l_1$ (Tue 10:00, $T_1$, weekday)
    - $l_3$ (Fri 19:00, $T_3$, weekday)
    - $l_4$ (Sat 23:00, $T_3$, weekend)
  - $u_3$: 3 check-ins:
    - $l_2$ (Sun 15:00, $T_2$, weekend)
    - $l_3$ (Mon 20:00, $T_3$, weekday)
    - $l_4$ (Sat 21:00, $T_3$, weekend)
  - $u_4$: 3 check-ins:
    - $l_1$ (Mon 09:00, $T_1$, weekday)
    - $l_3$ (Wed 19:00, $T_3$, weekday)
    - $l_4$ (Sun 22:00, $T_3$, weekend)
  - $u_5$: 2 check-ins:
    - $l_2$ (Wed 03:00, $T_4$, weekday)
    - $l_4$ (Fri 04:00, $T_4$, weekday)
- **Friend Sets $A_u$**:
  - $A_{u_1} = \{u_2, u_4\}$
  - $A_{u_2} = \{u_1, u_3, u_4\}$
  - $A_{u_3} = \{u_2, u_5\}$
  - $A_{u_4} = \{u_1, u_2\}$
  - $A_{u_5} = \{u_3\}$
- **Default Hyperparameters**:
  - $\theta = 0.6$ (Paper-Faithful sum mode)
  - $\alpha = 0.7$
  - $\text{Top-}N = 3$
  - $\text{logBase} = \text{'ln'}$
  - $\text{simMode} = \text{'paper\_sum'}$

---

## 5. UI Layout & Component Architecture

### Layout Structure
- **Header**: Title, paper citation, quick-action toolbar:
  - `Run Step` (runs current step)
  - `Run All` (executes all steps sequentially)
  - `Reset` (resets to Step 0)
  - `Load Demo` (resets to the standard verified mock dataset)
  - Mode toggle: Paper-Faithful ($\operatorname{sim}^m + \operatorname{sim}^u$) vs Normalized.
- **Top Bar - Algorithm Stepper (`AlgorithmStepper.tsx`)**:
  - 8-step horizontal interactive pipeline:
    - Step 0: Input Dataset
    - Step 1: User Category Pref (Eq 2, 3)
    - Step 2: User Time Pref (Eq 4, 5, 6)
    - Step 3: Group Pref Model (Eq 7, 8, 9)
    - Step 4: Group Similarity & Threshold (Eq 10, 11, 12, 13)
    - Step 5: Collaborative Filtering (Eq 14)
    - Step 6: Intragroup Divergence (Eq 15, 16)
    - Step 7: Final CFID Ranking (Eq 17)
  - Step status indicators: `Completed` (green), `Active` (blue), `Ready` (amber), `Blocked` (muted).
  - Clicking any previously completed step lets the user inspect inputs, formulas, and intermediate tables.
- **Main Content Area (Split View / Multi-card layout)**:
  - **Left / Top**: `FormulaCard.tsx`: Displays the mathematical equation, LaTeX rendered formula, variable definitions, and paper citations.
  - **Center**: `CalculationTrace.tsx`: Step-by-step substitution, showing the formula with variables replaced by exact numbers, fraction numerators, denominators, and intermediate values.
  - **Right / Bottom**: Interactive Matrix & Results:
    - Step 0: `InputTable.tsx` (view & edit users, POIs, check-ins, hyperparameters).
    - Steps 1–6: `MatrixTable.tsx` & `ResultTable.tsx` with heatmaps and inspectable cells.
    - Step 7: `RankingTable.tsx` (Top-N ranking with a visual breakdown bar: $f_{g,l}$ vs $d_{g,l}$).
- **Ambiguity & Paper Notes Drawer**:
  - Explains the Eq (12) normalization dilemma, Eq (11) typo, and log base options.

---

## 6. Implementation Order & Testing Plan

### Phase 1: Foundation & Project Scaffolding
1. Initialize Vite + React 19 + TypeScript + Vitest with Tailwind CSS and Lucide icons.
2. Define domain models in `src/domain/types.ts`.
3. Implement `src/data/mockDataset.ts` with the validated mock dataset.

### Phase 2: Pure Algorithm Modules & Unit Tests
Implement pure algorithm functions returning `{ value, expression, numerator, denominator, intermediateValues }`:
- `src/algorithm/categoryPreference.ts` (Eq 2, 3) + Unit test `categoryPreference.test.ts`
- `src/algorithm/timePreference.ts` (Eq 4, 5, 6) + Unit test `timePreference.test.ts`
- `src/algorithm/groupPreference.ts` (Eq 7, 8, 9) + Unit test `groupPreference.test.ts`
- `src/algorithm/similarity.ts` (Eq 10, 11, 12, 13) + Unit test `similarity.test.ts`
- `src/algorithm/collaborativeFiltering.ts` (Eq 14) + Unit test `collaborativeFiltering.test.ts`
- `src/algorithm/divergence.ts` (Eq 15, 16) + Unit test `divergence.test.ts`
- `src/algorithm/finalScore.ts` (Eq 17) + Unit test `finalScore.test.ts`
- `src/algorithm/pipeline.ts` (orchestrator with state invalidation) + Integration test `pipeline.test.ts`

### Phase 3: Interactive UI Components
- Build `FormulaCard.tsx` (equations, KaTeX/math formatting, variable legends).
- Build `CalculationTrace.tsx` (numerator/denominator breakdown, substituted formulas).
- Build `AlgorithmStepper.tsx` (pipeline stepper with status badges).
- Build `InputTable.tsx` (editable check-ins, parameters, friend sets with reactive invalidation).
- Build `MatrixTable.tsx` & `ResultTable.tsx` (heatmaps, drill-down modals).
- Build `RankingTable.tsx` (Top-N recommendation view with CF score vs divergence penalty).

### Phase 4: Integration, Verification & Polish
- Full pipeline run test with Vitest.
- Visual verification using browser subagent.
- Verify responsive layout, micro-interactions, and documentation.

---

## 7. Verification Plan

### Automated Tests
- Run `npm test` (or `npx vitest run`) covering:
  1. `categoryPreference.test.ts`: test TF, IDF, and Eq (2) calculations against manual arithmetic.
  2. `timePreference.test.ts`: test slot distribution, weekend ratio, and concatenated $M_u$.
  3. `groupPreference.test.ts`: test $\eta_u^g$ intersection calculation, affinity weighting, and fallback when no visits overlap.
  4. `similarity.test.ts`: test feature cosine, check-in cosine, Eq (12) sum vs normalized mode, and $\theta$ thresholding.
  5. `collaborativeFiltering.test.ts`: test $f_{g,l}$ numerator & denominator, handling zero similar users.
  6. `divergence.test.ts`: test $\delta(u,l)$ with friend set $A_u$ and all pairwise absolute differences $d_{g,l}$.
  7. `finalScore.test.ts`: test $\alpha$ weighted combination and ranking order.
  8. `pipeline.test.ts`: full end-to-end pipeline verification on the mock dataset.

### Manual / Visual Verification
- Start local dev server (`npm run dev`).
- Test "Run Step" sequentially from Step 0 to Step 7.
- Verify that every step shows:
  - Input values
  - Paper formula & equation number
  - Substituted numerical expression
  - Intermediate values
  - Output table
- Test "Run All", "Reset", and "Load Demo".
- Test changing an input (e.g. $\theta$ or $\alpha$ or editing a check-in) and verify that downstream steps are invalidated.
- Verify the Eq (12) paper-faithful vs normalized toggle.
