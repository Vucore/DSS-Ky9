/**
 * Domain types for CFID Algorithm Visualizer
 * Based on: "A Collaborative Filtering Algorithm with Intragroup Divergence for POI Group Recommendation"
 * (Appl. Sci. 2021, 11, 5416)
 */

export interface User {
  id: string;
  name: string;
}

export interface POI {
  id: string;
  name: string;
  categories: string[]; // POI category tags (c_i)
  latitude?: number;
  longitude?: number;
}

export interface Category {
  id: string;
  name: string;
}

export type TimeSlot = 'T1' | 'T2' | 'T3' | 'T4'; 
// T1: 07:00 - 12:00 (morning)
// T2: 13:00 - 18:00 (afternoon)
// T3: 19:00 - 24:00 (evening)
// T4: 01:00 - 06:00 (night)

export interface CheckInEvent {
  id: string;
  userId: string;
  poiId: string;
  hour: number; // 0 - 23
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday (0 & 6 are weekend)
  timestamp?: string;
}

export interface Group {
  id: string;
  name: string;
  memberUserIds: string[];
}

export type LogBase = 'ln' | 'log10' | 'log2';
export type SimMode = 'paper_sum' | 'normalized_avg';

export interface Hyperparameters {
  theta: number; // Similarity threshold (Eq 13)
  alpha: number; // CF vs Intragroup divergence trade-off parameter (Eq 17)
  topN: number;  // Number of recommendations
  logBase: LogBase;
  simMode: SimMode;
}

export type AppMode = 'result' | 'guided' | 'configure';

export interface Dataset {
  users: User[];
  pois: POI[];
  categories: Category[];
  checkIns: CheckInEvent[];
  groups: Group[];
  selectedGroupId: string;
  friendSets: Record<string, string[]>; // userId -> array of friend userIds (Au in Eq 16)
  hyperparameters: Hyperparameters;
}

/**
 * Calculation explanation metadata returned by pure algorithm functions.
 */
export interface CalculationTraceMeta {
  formulaNumber: string; // e.g. "Eq. (2)"
  formulaLatex: string;
  expression: string;    // Substituted numerical expression string
  expressionLatex?: string; // Substituted numerical expression formatted in valid KaTeX LaTeX
  inputs?: Record<string, any>;
  numerator?: number;
  denominator?: number;
  intermediateValues?: Record<string, any>;
  value: number;
}

// Step 1: User Category Preference (Eq 2, 3)
export interface Step1Output {
  // pu,c values and traces: userId -> categoryId -> Trace
  preferences: Record<string, Record<string, CalculationTraceMeta>>;
  // category feature vector Mc_u: userId -> number[]
  vectors: Record<string, number[]>;
  categoryIds: string[];
}

// Step 2: User Time Preference (Eq 4, 5, 6)
export interface Step2Output {
  timePreferences: Record<string, {
    slotCounts: Record<TimeSlot, number>;
    weekendCount: number;
    totalSlotVisits: number;
    totalVisits: number;
    traces: Record<'T1' | 'T2' | 'T3' | 'T4' | 'T5', CalculationTraceMeta>;
    vectorMt: number[]; // [p_u,t1, p_u,t2, p_u,t3, p_u,t4, p_u,t5]
  }>;
  // Concatenated user feature vector Mu = (Mc_u, Mt_u) (Eq 5, 6)
  userVectors: Record<string, {
    categoryPart: number[];
    timePart: number[];
    combinedMu: number[];
    featureNames: string[];
  }>;
}

// Step 3: Group Preference Model (Eq 7, 8, 9)
export interface Step3Output {
  memberAffinities: Record<string, {
    Lu: string[]; // POIs visited by user u
    Lu_g: string[]; // POIs visited by other group members
    intersection: string[];
    affinity: number; // eta_g_u (Eq 7)
    trace: CalculationTraceMeta;
  }>;
  // Group feature vector Mg = (pg,m1, ..., pg,mk) (Eq 8, 9)
  groupVectorMg: {
    features: number[];
    featureNames: string[];
    traces: CalculationTraceMeta[];
  };
}

// Step 4: Group/User Similarity (Eq 10, 11, 12, 13)
export interface Step4Output {
  similarities: Record<string, {
    userId: string;
    simM: CalculationTraceMeta; // Eq 10 (Feature preference cosine)
    simU: CalculationTraceMeta; // Eq 11 (Check-in cosine averaged over group members)
    combinedSim: CalculationTraceMeta; // Eq 12 (Combined similarity)
    passedThreshold: boolean;
    finalSim: number; // Eq 13 (0 if < theta)
    thresholdTrace: CalculationTraceMeta;
  }>;
  candidateUserIds: string[]; // Users passing threshold theta
}

// Step 5: Collaborative Filtering (Eq 14)
export interface Step5Output {
  cfScores: Record<string, {
    poiId: string;
    numerator: number;
    denominator: number;
    score: number; // fg,l
    trace: CalculationTraceMeta;
    contributingUsers: {
      userId: string;
      sim: number;
      hasVisited: boolean; // r_v,l
      contribution: number; // sim * r_v,l
    }[];
  }>;
}

// Step 6: Intragroup Divergence (Eq 15, 16)
export interface Step6Output {
  // Member probability delta(u, l) (Eq 16)
  memberProbabilities: Record<string, Record<string, { // userId -> poiId
    delta: number;
    friendsVisited: string[];
    totalFriends: number;
    trace: CalculationTraceMeta;
  }>>;
  // Group divergence dg,l (Eq 15)
  groupDivergences: Record<string, { // poiId
    pairs: {
      u1: string;
      u2: string;
      delta1: number;
      delta2: number;
      diff: number; // |delta1 - delta2|
    }[];
    sumDifferences: number;
    scalingFactor: number; // 2 / (n * (n - 1))
    divergence: number; // dg,l
    trace: CalculationTraceMeta;
  }>;
}

// Step 7: Final CFID Ranking (Eq 17)
export interface Step7Output {
  allScoredPois: {
    poiId: string;
    poiName: string;
    categoryNames: string[];
    cfScore: number; // fg,l
    divergence: number; // dg,l
    weightedCf: number; // alpha * fg,l
    weightedDivergence: number; // (1 - alpha) * dg,l
    finalScore: number; // f'_g,l
    trace: CalculationTraceMeta;
  }[];
  rankings: {
    rank: number;
    poiId: string;
    poiName: string;
    categoryNames: string[];
    cfScore: number; // fg,l
    divergence: number; // dg,l
    weightedCf: number; // alpha * fg,l
    weightedDivergence: number; // (1 - alpha) * dg,l
    finalScore: number; // f'_g,l
    trace: CalculationTraceMeta;
    isSeenByGroup?: boolean; // Case 1: Group visited vs Case 2: New POI for group
    seenByMemberIds?: string[];
  }[];
  topN: {
    rank: number;
    poiId: string;
    poiName: string;
    finalScore: number;
    isSeenByGroup?: boolean;
    seenByMemberIds?: string[];
  }[];
}

export type StepId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface StepStatus {
  stepId: StepId;
  name: string;
  equations: string[];
  isCompleted: boolean;
  canRun: boolean;
}

export interface SelectedTraceState {
  stepId: StepId;
  entityId: string;
  trace: CalculationTraceMeta;
  label: React.ReactNode;
  position?: { x: number; y: number };
}

export interface PipelineState {
  dataset: Dataset;
  currentStepId: StepId;
  selectedTrace?: SelectedTraceState | null;
  step1Output?: Step1Output;
  step2Output?: Step2Output;
  step3Output?: Step3Output;
  step4Output?: Step4Output;
  step5Output?: Step5Output;
  step6Output?: Step6Output;
  step7Output?: Step7Output;
}
