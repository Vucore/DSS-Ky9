import { Dataset, Step2Output, Step3Output, CalculationTraceMeta } from '../domain/types';
import { toMathId, toMathSet } from '../domain/notationRegistry';

/**
 * Step 3: The Group Preference Model Construction
 * Implements Equations (7), (8), and (9) from Section 3.4 of the paper.
 * 
 * Formula:
 * \eta_u^g = |L_u \cap L_{u, g}| / |L_u|  (Eq. 7)
 * p_{g, m_k} = \sum_{u \in g} (p_{u, m_k} * \eta_u^g) / \sum_{u \in g} \eta_u^g  (Eq. 8)
 * M_g = (p_{g, m_1}, ..., p_{g, m_K})  (Eq. 9)
 */
export function computeGroupPreference(
  dataset: Dataset,
  step2Output: Step2Output,
  groupId?: string
): Step3Output {
  const { groups, checkIns, selectedGroupId } = dataset;
  const targetGroupId = groupId || selectedGroupId || groups[0]?.id;
  const group = groups.find((g) => g.id === targetGroupId) || groups[0];

  if (!group) {
    throw new Error(`Group with id ${targetGroupId} not found.`);
  }

  const memberIds = group.memberUserIds;

  // 1. Calculate visited POIs for each group member: L_u
  const visitedPoisByUser: Record<string, Set<string>> = {};
  for (const uid of memberIds) {
    visitedPoisByUser[uid] = new Set(
      checkIns.filter((ck) => ck.userId === uid).map((ck) => ck.poiId)
    );
  }

  // 2. Compute member affinity eta_u^g (Eq. 7)
  const memberAffinities: Step3Output['memberAffinities'] = {};
  let sumAffinity = 0;

  for (const uid of memberIds) {
    const LuSet = visitedPoisByUser[uid] || new Set();
    const Lu = Array.from(LuSet);

    // Other group members' visited locations: L_{u, g}
    const Lu_gSet = new Set<string>();
    for (const otherId of memberIds) {
      if (otherId !== uid) {
        const otherPois = visitedPoisByUser[otherId] || new Set();
        for (const pid of otherPois) {
          Lu_gSet.add(pid);
        }
      }
    }
    const Lu_g = Array.from(Lu_gSet);

    // Intersection: L_u \cap L_{u, g}
    const intersection = Lu.filter((pid) => Lu_gSet.has(pid));

    let affinity = 0;
    if (Lu.length > 0) {
      affinity = intersection.length / Lu.length;
    }
    sumAffinity += affinity;

    const expression = Lu.length > 0
      ? `|{${intersection.join(', ')}}| / |{${Lu.join(', ')}}| = ${intersection.length} / ${Lu.length} = ${affinity.toFixed(4)}`
      : `0 / 0 = 0 (chưa có lượt ghé thăm nào)`;

    const uMath = toMathId(uid);
    const intersectionSet = toMathSet(intersection);
    const luSet = toMathSet(Lu);
    const expressionLatexEta = Lu.length > 0
      ? `\\eta_{${uMath}}^g = \\frac{|${intersectionSet}|}{|${luSet}|} = \\frac{${intersection.length}}{${Lu.length}} = ${affinity.toFixed(4)}`
      : `\\eta_{${uMath}}^g = 0`;

    memberAffinities[uid] = {
      Lu,
      Lu_g,
      intersection,
      affinity,
      trace: {
        formulaNumber: 'Công thức (7)',
        formulaLatex: `\\eta_u^g = \\frac{|L_u \\cap L_{u, g}|}{|L_u|}`,
        expression,
        expressionLatex: expressionLatexEta,
        inputs: {
          memberId: uid,
          Lu,
          Lu_g,
          intersection
        },
        numerator: intersection.length,
        denominator: Lu.length,
        value: affinity
      }
    };
  }

  // Fallback: If sumAffinity === 0 (no members share any locations), assign uniform weights 1 / |g|
  const weights: Record<string, number> = {};
  const effectiveSum = sumAffinity > 0 ? sumAffinity : memberIds.length;
  for (const uid of memberIds) {
    weights[uid] = sumAffinity > 0 ? memberAffinities[uid].affinity : 1;
  }

  // 3. Aggregate feature vector M_g (Eq. 8, 9)
  const sampleVector = step2Output.userVectors[memberIds[0]];
  const featureCount = sampleVector?.combinedMu?.length || 0;
  const featureNames = sampleVector?.featureNames || [];

  const groupFeatures: number[] = [];
  const traces: CalculationTraceMeta[] = [];

  for (let k = 0; k < featureCount; k++) {
    let numeratorSum = 0;
    const terms: string[] = [];
    const termsLatex: string[] = [];

    const memberValues: Record<string, number> = {};
    for (const uid of memberIds) {
      const uVal = step2Output.userVectors[uid]?.combinedMu?.[k] || 0;
      memberValues[uid] = uVal;
      const w = weights[uid];
      numeratorSum += uVal * w;
      terms.push(`(${uVal.toFixed(3)} * ${w.toFixed(3)})`);
      termsLatex.push(`(${uVal.toFixed(3)} \\times ${w.toFixed(3)})`);
    }

    const pg_mk = effectiveSum > 0 ? numeratorSum / effectiveSum : 0;
    groupFeatures.push(pg_mk);

    const fName = featureNames[k] || `Đặc trưng m_${k + 1}`;
    const expression = effectiveSum > 0
      ? `[${terms.join(' + ')}] / ${effectiveSum.toFixed(4)} = ${numeratorSum.toFixed(4)} / ${effectiveSum.toFixed(4)} = ${pg_mk.toFixed(4)}`
      : `0`;

    const expressionLatex = effectiveSum > 0
      ? `p_{g, m_{${k + 1}}} = \\frac{${termsLatex.join(' + ')}}{${effectiveSum.toFixed(4)}} = \\frac{${numeratorSum.toFixed(4)}}{${effectiveSum.toFixed(4)}} = ${pg_mk.toFixed(4)}`
      : `p_{g, m_{${k + 1}}} = 0`;

    traces.push({
      formulaNumber: 'Công thức (8)',
      formulaLatex: `p_{g, m_k} = \\frac{\\sum_{u \\in g} p_{u, m_k} \\times \\eta_u^g}{\\sum_{u \\in g} \\eta_u^g}`,
      expression,
      expressionLatex,
      inputs: {
        featureName: fName,
        featureIndex: k,
        memberIds,
        memberWeights: weights,
        memberValues,
        effectiveSum
      },
      numerator: numeratorSum,
      denominator: effectiveSum,
      value: pg_mk
    });
  }

  return {
    memberAffinities,
    groupVectorMg: {
      features: groupFeatures,
      featureNames,
      traces
    }
  };
}
