import { describe, it, expect } from 'vitest';
import { ORIGINAL_4POI_FIXTURE } from '../data/mockDataset';
import { computeCategoryPreferences } from '../algorithm/categoryPreference';
import { computeTimePreferences } from '../algorithm/timePreference';
import { computeGroupPreference } from '../algorithm/groupPreference';

describe('Step 3: Group Preference Model (Eq 7, 8, 9)', () => {
  it('should compute exact member affinities eta_u^g and aggregated Mg', () => {
    const step1 = computeCategoryPreferences(ORIGINAL_4POI_FIXTURE);
    const step2 = computeTimePreferences(ORIGINAL_4POI_FIXTURE, step1);
    const step3 = computeGroupPreference(ORIGINAL_4POI_FIXTURE, step2);

    // Group g1 has members: u1, u2, u3
    // u1 visited: {l1, l2, l3} (3 distinct POIs)
    // u2 visited: {l1, l3, l4} (3 distinct POIs)
    // u3 visited: {l2, l3, l4} (3 distinct POIs)
    //
    // For u1:
    // L_{u1, g} = {l1, l3, l4} U {l2, l3, l4} = {l1, l2, l3, l4}
    // Intersection = {l1, l2, l3}
    // eta_{u1}^g = 3 / 3 = 1.0
    expect(step3.memberAffinities['u1'].affinity).toBe(1.0);
    expect(step3.memberAffinities['u1'].intersection.sort()).toEqual(['l1', 'l2', 'l3']);

    // For u2:
    // L_{u2, g} = {l1, l2, l3} U {l2, l3, l4} = {l1, l2, l3, l4}
    // Intersection = {l1, l3, l4}
    // eta_{u2}^g = 3 / 3 = 1.0
    expect(step3.memberAffinities['u2'].affinity).toBe(1.0);

    // For u3:
    // L_{u3, g} = {l1, l2, l3} U {l1, l3, l4} = {l1, l2, l3, l4}
    // Intersection = {l2, l3, l4}
    // eta_{u3}^g = 3 / 3 = 1.0
    expect(step3.memberAffinities['u3'].affinity).toBe(1.0);

    // Group feature vector Mg: sum of weights = 3. Each member has equal weight 1/3
    // Feature 0: Category c1 (Coffee)
    // u1: 0.5 * ln(4), u2: (1/3) * ln(4), u3: 0
    // sum = (0.5 + 1/3) * ln(4) = (5/6) * ln(4)
    // average = (5/18) * ln(4) approx 0.38508
    const idf = Math.log(4);
    const expectedC1 = ((0.5 + 1 / 3) * idf) / 3;
    expect(step3.groupVectorMg.features[0]).toBeCloseTo(expectedC1, 5);
  });

  it('should handle fallback when members share no POIs', () => {
    const dataset = {
      ...ORIGINAL_4POI_FIXTURE,
      checkIns: [
        { id: '1', userId: 'u1', poiId: 'l1', hour: 10, dayOfWeek: 1 },
        { id: '2', userId: 'u2', poiId: 'l2', hour: 10, dayOfWeek: 1 },
        { id: '3', userId: 'u3', poiId: 'l3', hour: 10, dayOfWeek: 1 }
      ]
    };
    const step1 = computeCategoryPreferences(dataset);
    const step2 = computeTimePreferences(dataset, step1);
    const step3 = computeGroupPreference(dataset, step2);

    expect(step3.memberAffinities['u1'].affinity).toBe(0);
    expect(step3.memberAffinities['u2'].affinity).toBe(0);
    expect(step3.memberAffinities['u3'].affinity).toBe(0);
    // Should fallback gracefully without NaN
    expect(Number.isNaN(step3.groupVectorMg.features[0])).toBe(false);
  });
});
