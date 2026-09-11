import { Dataset, Step6Output, CalculationTraceMeta } from '../domain/types';
import { toMathId, toMathSet } from '../domain/notationRegistry';

/**
 * Step 6: Group Recommendation Based on Intragroup Divergence
 * Implements Equations (15) and (16) from Section 3.5 (4) of the paper.
 * 
 * Formula:
 * \delta(u, l) = (1 / |A_u|) * \sum_{v \in A_u} r(v, l)  (Eq. 16)
 * d_{g, l} = [2 / (n * (n - 1))] * \sum_{u < u'} |\delta(u, l) - \delta(u', l)|  (Eq. 15)
 */
export function computeIntragroupDivergence(
  dataset: Dataset,
  groupId?: string
): Step6Output {
  const { pois, groups, checkIns, friendSets, selectedGroupId } = dataset;
  const targetGroupId = groupId || selectedGroupId || groups[0]?.id;
  const group = groups.find((g) => g.id === targetGroupId) || groups[0];

  if (!group) {
    throw new Error(`Group with id ${targetGroupId} not found.`);
  }

  const memberIds = group.memberUserIds;
  const n = memberIds.length;

  // Build binary visited set: userId -> Set of poiIds
  const userVisitedPoi: Record<string, Set<string>> = {};
  for (const ck of checkIns) {
    if (!userVisitedPoi[ck.userId]) {
      userVisitedPoi[ck.userId] = new Set();
    }
    userVisitedPoi[ck.userId].add(ck.poiId);
  }

  // 1. Compute delta(u, l) for every member u in g and every poi l (Eq. 16)
  const memberProbabilities: Step6Output['memberProbabilities'] = {};

  for (const uid of memberIds) {
    memberProbabilities[uid] = {};
    const friends = friendSets[uid] || [];
    const totalFriends = friends.length;

    for (const poi of pois) {
      const friendsVisited = friends.filter((fId) => userVisitedPoi[fId]?.has(poi.id));
      const countVisited = friendsVisited.length;

      const delta = totalFriends > 0 ? countVisited / totalFriends : 0;
      const expression = totalFriends > 0
        ? `|{${friendsVisited.join(', ')}}| / |{${friends.join(', ')}}| = ${countVisited} / ${totalFriends} = ${delta.toFixed(4)}`
        : `0 / 0 = 0 (không có bạn bè trong tập Au)`;

      const uMath = toMathId(uid);
      const pMath = toMathId(poi.id);
      const fVisitedSet = toMathSet(friendsVisited);
      const friendsSet = toMathSet(friends);
      const expressionLatexDelta = totalFriends > 0
        ? `\\delta(${uMath}, ${pMath}) = \\frac{|${fVisitedSet}|}{|${friendsSet}|} = \\frac{${countVisited}}{${totalFriends}} = ${delta.toFixed(4)}`
        : `\\delta(${uMath}, ${pMath}) = 0`;

      const trace: CalculationTraceMeta = {
        formulaNumber: 'Công thức (16)',
        formulaLatex: `\\delta(u, l) = \\frac{1}{|A_u|} \\sum_{v \\in A_u} r(v, l)`,
        expression,
        expressionLatex: expressionLatexDelta,
        inputs: {
          memberId: uid,
          poiId: poi.id,
          friendSetAu: friends,
          friendsVisited
        },
        numerator: countVisited,
        denominator: totalFriends,
        value: delta
      };

      memberProbabilities[uid][poi.id] = {
        delta,
        friendsVisited,
        totalFriends,
        trace
      };
    }
  }

  // 2. Compute group divergence d_{g, l} for every poi l (Eq. 15)
  const groupDivergences: Step6Output['groupDivergences'] = {};
  const numPairs = (n * (n - 1)) / 2;
  const scalingFactor = numPairs > 0 ? 2 / (n * (n - 1)) : 0;

  for (const poi of pois) {
    const pairs: Step6Output['groupDivergences'][string]['pairs'] = [];
    let sumDifferences = 0;
    const diffTerms: string[] = [];

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const u1 = memberIds[i];
        const u2 = memberIds[j];
        const delta1 = memberProbabilities[u1]?.[poi.id]?.delta || 0;
        const delta2 = memberProbabilities[u2]?.[poi.id]?.delta || 0;
        const diff = Math.abs(delta1 - delta2);

        sumDifferences += diff;
        pairs.push({ u1, u2, delta1, delta2, diff });
        diffTerms.push(`|${delta1.toFixed(3)} - ${delta2.toFixed(3)}| = ${diff.toFixed(3)}`);
      }
    }

    const divergence = scalingFactor * sumDifferences;
    const expression = numPairs > 0
      ? `[2 / (${n} * ${n - 1})] * (${pairs.map((p) => p.diff.toFixed(3)).join(' + ')}) = (1 / ${numPairs}) * ${sumDifferences.toFixed(4)} = ${divergence.toFixed(4)}`
      : `0 (nhóm chỉ có 1 thành viên)`;

    const pairDiffsLatex = pairs.map((p) => `|${p.delta1.toFixed(3)} - ${p.delta2.toFixed(3)}|`).join(' + ');
    const pMath = toMathId(poi.id);
    const expressionLatexDiv = numPairs > 0
      ? `d_{g, ${pMath}} = \\frac{2}{${n} \\times (${n} - 1)} \\times \\left( ${pairDiffsLatex} \\right) = \\frac{1}{${numPairs}} \\times ${sumDifferences.toFixed(4)} = ${divergence.toFixed(4)}`
      : `d_{g, ${pMath}} = 0`;

    const trace: CalculationTraceMeta = {
      formulaNumber: 'Công thức (15)',
      formulaLatex: `d_{g, l} = \\frac{2}{n(n - 1)} \\times \\sum_{u < u'} |\\delta(u, l) - \\delta(u', l)|`,
      expression,
      expressionLatex: expressionLatexDiv,
      inputs: {
        poiId: poi.id,
        groupSize: n,
        numPairs
      },
      numerator: 2 * sumDifferences,
      denominator: n * (n - 1),
      intermediateValues: {
        pairsSummary: diffTerms,
        sumDifferences,
        scalingFactor
      },
      value: divergence
    };

    groupDivergences[poi.id] = {
      pairs,
      sumDifferences,
      scalingFactor,
      divergence,
      trace
    };
  }

  return {
    memberProbabilities,
    groupDivergences
  };
}
