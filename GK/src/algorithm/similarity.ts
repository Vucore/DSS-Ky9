import { Dataset, Step2Output, Step3Output, Step4Output, CalculationTraceMeta } from '../domain/types';
import { toMathId } from '../domain/notationRegistry';

/**
 * Step 4: Group/User Similarity Computation & Thresholding
 * Implements Equations (10), (11), (12), and (13) from Section 3.5 of the paper.
 */

// Helper to compute cosine similarity between two vectors
export function cosineSimilarity(vecA: number[], vecB: number[]): {
  dotProduct: number;
  normA: number;
  normB: number;
  cosine: number;
  expression: string;
} {
  let dotProduct = 0;
  let sumSqA = 0;
  let sumSqB = 0;

  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    sumSqA += vecA[i] * vecA[i];
    sumSqB += vecB[i] * vecB[i];
  }

  const normA = Math.sqrt(sumSqA);
  const normB = Math.sqrt(sumSqB);
  const denom = normA * normB;
  const cosine = denom > 0 ? dotProduct / denom : 0;

  const expression = denom > 0
    ? `${dotProduct.toFixed(4)} / (${normA.toFixed(4)} * ${normB.toFixed(4)}) = ${cosine.toFixed(4)}`
    : `0 / 0 = 0`;

  return { dotProduct, normA, normB, cosine, expression };
}

export function computeGroupUserSimilarity(
  dataset: Dataset,
  step2Output: Step2Output,
  step3Output: Step3Output,
  groupId?: string
): Step4Output {
  const { users, pois, groups, checkIns, hyperparameters, selectedGroupId } = dataset;
  const targetGroupId = groupId || selectedGroupId || groups[0]?.id;
  const group = groups.find((g) => g.id === targetGroupId) || groups[0];

  if (!group) {
    throw new Error(`Group with id ${targetGroupId} not found.`);
  }

  const memberIds = group.memberUserIds;
  const groupVector = step3Output.groupVectorMg.features;
  const simMode = hyperparameters.simMode || 'paper_sum';
  const theta = hyperparameters.theta;

  // Build binary check-in vectors for all users: r_{u, l_k} in {0, 1} (Sec 3.5, Eq 11)
  const binaryCheckIns: Record<string, number[]> = {};
  for (const u of users) {
    const userVisited = new Set(
      checkIns.filter((ck) => ck.userId === u.id).map((ck) => ck.poiId)
    );
    binaryCheckIns[u.id] = pois.map((poi) => (userVisited.has(poi.id) ? 1 : 0));
  }

  const similarities: Step4Output['similarities'] = {};
  const candidateUserIds: string[] = [];

  for (const user of users) {
    const userFeatureVector = step2Output.userVectors[user.id]?.combinedMu || [];

    // 1. Feature Preference Cosine Similarity: sim^m_{g, v} (Eq. 10)
    const mCos = cosineSimilarity(groupVector, userFeatureVector);
    const simMExprLatex = mCos.normA * mCos.normB > 0
      ? `\\operatorname{sim}^m_{g, ${user.id}} = \\frac{${mCos.dotProduct.toFixed(4)}}{${mCos.normA.toFixed(4)} \\times ${mCos.normB.toFixed(4)}} = \\frac{${mCos.dotProduct.toFixed(4)}}{${(mCos.normA * mCos.normB).toFixed(4)}} = ${mCos.cosine.toFixed(4)}`
      : `\\operatorname{sim}^m_{g, ${user.id}} = 0`;

    const simMTrace: CalculationTraceMeta = {
      formulaNumber: 'Công thức (10)',
      formulaLatex: `\\operatorname{sim}^m_{g, v} = \\frac{\\sum_{i=1}^M p_{g, m_i} p_{v, m_i}}{\\sqrt{\\sum_{i=1}^M (p_{g, m_i})^2} \\sqrt{\\sum_{i=1}^M (p_{v, m_i})^2}}`,
      expression: mCos.expression,
      expressionLatex: simMExprLatex,
      inputs: {
        group: group.name,
        user: user.name
      },
      numerator: mCos.dotProduct,
      denominator: mCos.normA * mCos.normB,
      intermediateValues: {
        dotProduct: mCos.dotProduct,
        normGroup: mCos.normA,
        normUser: mCos.normB
      },
      value: mCos.cosine
    };

    // 2. Check-in Cosine Similarity averaged over group members: sim^u_{g, v} (Eq. 11)
    let sumMemberCosine = 0;
    const memberBreakdown: { memberId: string; cosine: number; expr: string }[] = [];

    for (const memId of memberIds) {
      const memVec = binaryCheckIns[memId] || [];
      const uVec = binaryCheckIns[user.id] || [];
      const uCos = cosineSimilarity(memVec, uVec);
      sumMemberCosine += uCos.cosine;
      memberBreakdown.push({
        memberId: memId,
        cosine: uCos.cosine,
        expr: uCos.expression
      });
    }

    const n_g = memberIds.length;
    const simUValue = n_g > 0 ? sumMemberCosine / n_g : 0;
    const simUExpr = n_g > 0
      ? `(1 / ${n_g}) * [${memberBreakdown.map((m) => m.cosine.toFixed(4)).join(' + ')}] = ${sumMemberCosine.toFixed(4)} / ${n_g} = ${simUValue.toFixed(4)}`
      : `0`;

    const uMath = toMathId(user.id);
    const simULatexExpr = n_g > 0
      ? `\\operatorname{sim}^u_{g, ${uMath}} = \\frac{1}{${n_g}} \\left( ${memberBreakdown.map((m) => m.cosine.toFixed(4)).join(' + ')} \\right) = \\frac{${sumMemberCosine.toFixed(4)}}{${n_g}} = ${simUValue.toFixed(4)}`
      : `\\operatorname{sim}^u_{g, ${uMath}} = 0`;

    const simUTrace: CalculationTraceMeta = {
      formulaNumber: 'Công thức (11)',
      formulaLatex: `\\operatorname{sim}^u_{g, v} = \\frac{1}{n(g)} \\sum_{u \\in g} \\frac{\\sum_{k=1}^m r_{u, l_k} r_{v, l_k}}{\\sqrt{\\sum_{k=1}^m (r_{u, l_k})^2} \\sqrt{\\sum_{k=1}^m (r_{v, l_k})^2}}`,
      expression: simUExpr,
      expressionLatex: simULatexExpr,
      inputs: {
        groupSize: n_g,
        memberCosines: memberBreakdown.map((m) => `${m.memberId}: ${m.cosine.toFixed(4)}`)
      },
      numerator: sumMemberCosine,
      denominator: n_g,
      value: simUValue
    };

    // 3. Combined Similarity: sim_{g, v} (Eq. 12)
    let combinedSimValue = 0;
    let combinedLatex = '';
    let combinedExpr = '';
    let combinedExprLatex = '';

    if (simMode === 'paper_sum') {
      combinedSimValue = mCos.cosine + simUValue;
      combinedLatex = `\\operatorname{sim}_{g, v} = \\operatorname{sim}^m_{g, v} + \\operatorname{sim}^u_{g, v}`;
      combinedExpr = `${mCos.cosine.toFixed(4)} + ${simUValue.toFixed(4)} = ${combinedSimValue.toFixed(4)}`;
      combinedExprLatex = `\\operatorname{sim}_{g, ${uMath}} = \\operatorname{sim}^m_{g, ${uMath}} + \\operatorname{sim}^u_{g, ${uMath}} = ${mCos.cosine.toFixed(4)} + ${simUValue.toFixed(4)} = ${combinedSimValue.toFixed(4)}`;
    } else {
      // normalized_avg
      combinedSimValue = (mCos.cosine + simUValue) / 2;
      combinedLatex = `\\operatorname{sim}_{g, v} = \\frac{\\operatorname{sim}^m_{g, v} + \\operatorname{sim}^u_{g, v}}{2}`;
      combinedExpr = `(${mCos.cosine.toFixed(4)} + ${simUValue.toFixed(4)}) / 2 = ${combinedSimValue.toFixed(4)}`;
      combinedExprLatex = `\\operatorname{sim}_{g, ${uMath}} = \\frac{\\operatorname{sim}^m_{g, ${uMath}} + \\operatorname{sim}^u_{g, ${uMath}}}{2} = \\frac{${mCos.cosine.toFixed(4)} + ${simUValue.toFixed(4)}}{2} = ${combinedSimValue.toFixed(4)}`;
    }

    const combinedTrace: CalculationTraceMeta = {
      formulaNumber: 'Công thức (12)',
      formulaLatex: combinedLatex,
      expression: combinedExpr,
      expressionLatex: combinedExprLatex,
      inputs: {
        simM: mCos.cosine,
        simU: simUValue,
        simMode
      },
      intermediateValues: {
        simM: mCos.cosine,
        simU: simUValue
      },
      value: combinedSimValue
    };

    // 4. Thresholding: Eq. (13)
    const passedThreshold = combinedSimValue >= theta;
    const finalSim = passedThreshold ? combinedSimValue : 0;

    const thresholdExprLatex = passedThreshold
      ? `\\operatorname{sim}_{g, ${uMath}} = ${combinedSimValue.toFixed(4)} \\ge \\theta (${theta}) \\implies \\operatorname{sim}_{g, ${uMath}} = ${combinedSimValue.toFixed(4)}`
      : `\\operatorname{sim}_{g, ${uMath}} = ${combinedSimValue.toFixed(4)} < \\theta (${theta}) \\implies \\operatorname{sim}_{g, ${uMath}} = 0`;

    const thresholdTrace: CalculationTraceMeta = {
      formulaNumber: 'Công thức (13)',
      formulaLatex: `\\operatorname{sim}_{g, v} = 0 \\text{ if } \\operatorname{sim}_{g, v} < \\theta`,
      expression: passedThreshold
        ? `${combinedSimValue.toFixed(4)} >= ${theta} (ĐẠT NGƯỠNG) -> ${combinedSimValue.toFixed(4)}`
        : `${combinedSimValue.toFixed(4)} < ${theta} (BỊ LOẠI) -> 0`,
      expressionLatex: thresholdExprLatex,
      inputs: {
        combinedSim: combinedSimValue,
        theta
      },
      intermediateValues: {
        passed: passedThreshold ? 1 : 0
      },
      value: finalSim
    };

    similarities[user.id] = {
      userId: user.id,
      simM: simMTrace,
      simU: simUTrace,
      combinedSim: combinedTrace,
      passedThreshold,
      finalSim,
      thresholdTrace
    };

    if (passedThreshold) {
      candidateUserIds.push(user.id);
    }
  }

  return {
    similarities,
    candidateUserIds
  };
}
