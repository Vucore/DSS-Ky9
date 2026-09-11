import {
  Dataset,
  Step5Output,
  Step6Output,
  Step7Output,
  CalculationTraceMeta
} from '../domain/types';
import { toMathId } from '../domain/notationRegistry';

/**
 * Bước 7: Tính điểm khuyến nghị CFID cuối cùng và Xếp hạng Top-N
 * Thực thi Công thức (17) từ Mục 3.5 (4) và Thuật toán 1 của bài báo.
 * 
 * Công thức:
 * f'_{g, l} = \alpha \times f_{g, l} - (1 - \alpha) \times d_{g, l}
 * 
 * Toàn bộ các địa điểm l \in L được tính điểm và xếp hạng trực tiếp theo đúng công thức gốc.
 * Đồng thời phân loại rõ 2 trường hợp:
 * - Trường hợp 1: Địa điểm nhóm đã từng ghé thăm (isSeenByGroup = true)
 * - Trường hợp 2: Địa điểm mới hoàn toàn đối với nhóm (isSeenByGroup = false)
 */
export function computeFinalRanking(
  dataset: Dataset,
  step5Output: Step5Output,
  step6Output: Step6Output
): Step7Output {
  const { pois, categories, hyperparameters, checkIns, groups, selectedGroupId } = dataset;
  const alpha = hyperparameters.alpha;
  const topN = hyperparameters.topN;

  const currentGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];
  const groupMemberIds = new Set(currentGroup?.memberUserIds || []);

  const catNameMap = new Map(categories.map((c) => [c.id, c.name]));

  // Map POI -> danh sách thành viên nhóm đã từng check-in
  const poiGroupVisitorsMap = new Map<string, string[]>();
  for (const p of pois) {
    poiGroupVisitorsMap.set(p.id, []);
  }
  for (const ck of checkIns) {
    if (groupMemberIds.has(ck.userId) && poiGroupVisitorsMap.has(ck.poiId)) {
      const arr = poiGroupVisitorsMap.get(ck.poiId)!;
      if (!arr.includes(ck.userId)) {
        arr.push(ck.userId);
      }
    }
  }

  const allScoredPois: Step7Output['allScoredPois'] = [];

  for (const poi of pois) {
    const cfScore = step5Output.cfScores[poi.id]?.score || 0;
    const divergence = step6Output.groupDivergences[poi.id]?.divergence || 0;

    const weightedCf = alpha * cfScore;
    const weightedDivergence = (1 - alpha) * divergence;
    const finalScore = weightedCf - weightedDivergence;

    const pMath = toMathId(poi.id);
    const expression = `(${alpha} * ${cfScore.toFixed(4)}) - ((1 - ${alpha}) * ${divergence.toFixed(4)}) = ${weightedCf.toFixed(4)} - ${weightedDivergence.toFixed(4)} = ${finalScore.toFixed(4)}`;
    const expressionLatex = `f'_{g, ${pMath}} = (${alpha} \\times ${cfScore.toFixed(4)}) - ((1 - ${alpha}) \\times ${divergence.toFixed(4)}) = ${weightedCf.toFixed(4)} - ${weightedDivergence.toFixed(4)} = ${finalScore.toFixed(4)}`;

    const seenMembers = poiGroupVisitorsMap.get(poi.id) || [];
    const isSeenByGroup = seenMembers.length > 0;

    const trace: CalculationTraceMeta = {
      formulaNumber: 'Công thức (17)',
      formulaLatex: `f'_{g, l} = \\alpha f_{g, l} - (1 - \\alpha) d_{g, l}`,
      expression,
      expressionLatex,
      inputs: {
        poiId: poi.id,
        poiName: poi.name,
        alpha,
        oneMinusAlpha: 1 - alpha,
        cfScore,
        divergence,
        isSeenByGroup,
        seenMembers
      },
      intermediateValues: {
        weightedCf,
        weightedDivergence
      },
      value: finalScore
    };

    const categoryNames = poi.categories.map((cId) => catNameMap.get(cId) || cId);

    allScoredPois.push({
      poiId: poi.id,
      poiName: poi.name,
      categoryNames,
      cfScore,
      divergence,
      weightedCf,
      weightedDivergence,
      finalScore,
      trace
    });
  }

  // Sắp xếp giảm dần theo finalScore (Bám sát Thuật toán 1 dòng 10: sort f'_{g,l} in descending order)
  const sortedPois = [...allScoredPois].sort((a, b) => b.finalScore - a.finalScore);

  const rankings: Step7Output['rankings'] = sortedPois.map((item, index) => {
    const seenMembers = poiGroupVisitorsMap.get(item.poiId) || [];
    const isSeen = seenMembers.length > 0;

    return {
      rank: index + 1,
      poiId: item.poiId,
      poiName: item.poiName,
      categoryNames: item.categoryNames,
      cfScore: item.cfScore,
      divergence: item.divergence,
      weightedCf: item.weightedCf,
      weightedDivergence: item.weightedDivergence,
      finalScore: item.finalScore,
      trace: item.trace,
      isSeenByGroup: isSeen,
      seenByMemberIds: seenMembers
    };
  });

  const topNList = rankings.slice(0, topN).map((item) => ({
    rank: item.rank,
    poiId: item.poiId,
    poiName: item.poiName,
    finalScore: item.finalScore,
    isSeenByGroup: item.isSeenByGroup,
    seenByMemberIds: item.seenByMemberIds
  }));

  return {
    allScoredPois,
    rankings,
    topN: topNList
  };
}
