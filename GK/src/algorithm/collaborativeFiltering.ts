import { Dataset, Step4Output, Step5Output, CalculationTraceMeta } from '../domain/types';
import { toMathId } from '../domain/notationRegistry';

/**
 * Step 5: Collaborative Filtering for Candidate POIs
 * Implements Equation (14) from Section 3.5 (3) of the paper.
 * 
 * Formula:
 * f_{g, l} = \sum_{v \in U} (\operatorname{sim}_{g, v} * r_{v, l}) / \sum_{v \in U} \operatorname{sim}_{g, v}
 */
export function computeCollaborativeFiltering(
  dataset: Dataset,
  step4Output: Step4Output
): Step5Output {
  const { users, pois, checkIns } = dataset;

  const cfScores: Step5Output['cfScores'] = {};

  // Build binary check-in map: userId -> poiId -> 1 or 0
  const userVisitedPoi: Record<string, Record<string, boolean>> = {};
  for (const u of users) {
    userVisitedPoi[u.id] = {};
    for (const p of pois) {
      userVisitedPoi[u.id][p.id] = false;
    }
  }

  for (const ck of checkIns) {
    if (userVisitedPoi[ck.userId]) {
      userVisitedPoi[ck.userId][ck.poiId] = true;
    }
  }

  // Denominator: sum_{v in U} sim_{g, v} (where sim is the thresholded finalSim >= theta)
  let totalSimSum = 0;
  const validUsers: { userId: string; sim: number }[] = [];

  for (const u of users) {
    const simRecord = step4Output.similarities[u.id];
    const sim = simRecord?.finalSim || 0;
    if (sim > 0) {
      totalSimSum += sim;
      validUsers.push({ userId: u.id, sim });
    }
  }

  for (const poi of pois) {
    let numeratorSum = 0;
    const contributingUsers: Step5Output['cfScores'][string]['contributingUsers'] = [];
    const termStrings: string[] = [];

    for (const u of users) {
      const sim = step4Output.similarities[u.id]?.finalSim || 0;
      const hasVisited = userVisitedPoi[u.id]?.[poi.id] || false;
      const r_vl = hasVisited ? 1 : 0;
      const contribution = sim * r_vl;

      if (sim > 0) {
        numeratorSum += contribution;
        contributingUsers.push({
          userId: u.id,
          sim,
          hasVisited,
          contribution
        });
        termStrings.push(`(${sim.toFixed(3)} * ${r_vl})`);
      }
    }

    const score = totalSimSum > 0 ? numeratorSum / totalSimSum : 0;
    const expression = totalSimSum > 0
      ? `[${termStrings.join(' + ')}] / ${totalSimSum.toFixed(4)} = ${numeratorSum.toFixed(4)} / ${totalSimSum.toFixed(4)} = ${score.toFixed(4)}`
      : `0 / 0 = 0 (không có người dùng nào vượt qua ngưỡng)`;

    const termLatexList = contributingUsers.map(
      (cu) => `(${cu.sim.toFixed(3)} \\times ${cu.hasVisited ? 1 : 0})`
    );
    const pMath = toMathId(poi.id);
    const expressionLatex = totalSimSum > 0
      ? `f_{g, ${pMath}} = \\frac{${termLatexList.length > 0 ? termLatexList.join(' + ') : '0'}}{${totalSimSum.toFixed(4)}} = \\frac{${numeratorSum.toFixed(4)}}{${totalSimSum.toFixed(4)}} = ${score.toFixed(4)}`
      : `f_{g, ${pMath}} = 0`;

    const trace: CalculationTraceMeta = {
      formulaNumber: 'Công thức (14)',
      formulaLatex: `f_{g, l} = \\frac{\\sum_{v \\in U} \\operatorname{sim}_{g, v} \\times r_{v, l}}{\\sum_{v \\in U} \\operatorname{sim}_{g, v}}`,
      expression,
      expressionLatex,
      inputs: {
        poiId: poi.id,
        poiName: poi.name,
        numValidUsers: validUsers.length
      },
      numerator: numeratorSum,
      denominator: totalSimSum,
      value: score
    };

    cfScores[poi.id] = {
      poiId: poi.id,
      numerator: numeratorSum,
      denominator: totalSimSum,
      score,
      trace,
      contributingUsers
    };
  }

  return { cfScores };
}
