import { describe, it, expect } from 'vitest';
import { INITIAL_MOCK_DATASET, ORIGINAL_4POI_FIXTURE } from '../data/mockDataset';
import { computeCategoryPreferences } from '../algorithm/categoryPreference';
import { computeTimePreferences } from '../algorithm/timePreference';
import { computeGroupPreference } from '../algorithm/groupPreference';
import { computeGroupUserSimilarity } from '../algorithm/similarity';
import { computeCollaborativeFiltering } from '../algorithm/collaborativeFiltering';
import { computeIntragroupDivergence } from '../algorithm/divergence';
import { computeFinalRanking } from '../algorithm/finalScore';

describe('Step 7: Final CFID Ranking (Eq 17)', () => {
  it('should compute final scores and rank all POIs following original paper formula', () => {
    const dataset = ORIGINAL_4POI_FIXTURE;
    const step1 = computeCategoryPreferences(dataset);
    const step2 = computeTimePreferences(dataset, step1);
    const step3 = computeGroupPreference(dataset, step2);
    const step4 = computeGroupUserSimilarity(dataset, step2, step3);
    const step5 = computeCollaborativeFiltering(dataset, step4);
    const step6 = computeIntragroupDivergence(dataset);
    const step7 = computeFinalRanking(dataset, step5, step6);

    expect(step7.rankings.length).toBe(4);
    expect(step7.topN.length).toBe(3);

    // Verify descending sort
    for (let i = 0; i < step7.rankings.length - 1; i++) {
      expect(step7.rankings[i].finalScore).toBeGreaterThanOrEqual(step7.rankings[i + 1].finalScore);
      expect(step7.rankings[i].rank).toBe(i + 1);
    }

    // Verify Eq 17 formula exact arithmetic: f'_{g,l} = alpha * f_{g,l} - (1 - alpha) * d_{g,l}
    const alpha = dataset.hyperparameters.alpha;
    for (const item of step7.rankings) {
      const expectedFinal = alpha * item.cfScore - (1 - alpha) * item.divergence;
      expect(item.finalScore).toBeCloseTo(expectedFinal, 5);
    }
  });

  it('should accurately tag both Case 1 (visited by group) and Case 2 (new for group) on INITIAL_MOCK_DATASET', () => {
    const dataset = INITIAL_MOCK_DATASET;
    const step1 = computeCategoryPreferences(dataset);
    const step2 = computeTimePreferences(dataset, step1);
    const step3 = computeGroupPreference(dataset, step2);
    const step4 = computeGroupUserSimilarity(dataset, step2, step3);
    const step5 = computeCollaborativeFiltering(dataset, step4);
    const step6 = computeIntragroupDivergence(dataset);
    const step7 = computeFinalRanking(dataset, step5, step6);

    expect(step7.rankings.length).toBe(6);
    expect(step7.topN.length).toBe(3);

    // Case 1: l1, l2, l3 have been visited by u1, u2, u3
    const l1Record = step7.rankings.find((r) => r.poiId === 'l1');
    const l2Record = step7.rankings.find((r) => r.poiId === 'l2');
    const l3Record = step7.rankings.find((r) => r.poiId === 'l3');
    expect(l1Record?.isSeenByGroup).toBe(true);
    expect(l2Record?.isSeenByGroup).toBe(true);
    expect(l3Record?.isSeenByGroup).toBe(true);

    // Case 2: l4, l5, l6 are new POIs that group members haven't visited
    const l4Record = step7.rankings.find((r) => r.poiId === 'l4');
    const l5Record = step7.rankings.find((r) => r.poiId === 'l5');
    const l6Record = step7.rankings.find((r) => r.poiId === 'l6');
    expect(l4Record?.isSeenByGroup).toBe(false);
    expect(l5Record?.isSeenByGroup).toBe(false);
    expect(l6Record?.isSeenByGroup).toBe(false);

    // 3 visited and 3 new POIs total
    const visited = step7.rankings.filter((r) => r.isSeenByGroup);
    const unvisited = step7.rankings.filter((r) => !r.isSeenByGroup);
    expect(visited.length).toBe(3);
    expect(unvisited.length).toBe(3);

    // Unvisited POI l4 is successfully ranked in Top-N (Rank 2 in Top-3)
    expect(l4Record?.rank).toBe(2);
    expect(step7.topN.some((r) => r.poiId === 'l4')).toBe(true);
  });
});
