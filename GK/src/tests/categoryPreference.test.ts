import { describe, it, expect } from 'vitest';
import { ORIGINAL_4POI_FIXTURE } from '../data/mockDataset';
import { computeCategoryPreferences } from '../algorithm/categoryPreference';

describe('Step 1: User Category Preference (Eq 2, 3)', () => {
  it('should compute exact category preferences for mock dataset', () => {
    const output = computeCategoryPreferences(ORIGINAL_4POI_FIXTURE);

    expect(output.categoryIds).toEqual(['c1', 'c2', 'c3', 'c4']);

    // Check user u1 (Alice):
    // Total checkins = 4 (l1=2, l2=1, l3=1, l4=0)
    // l1 is c1 (Coffee) -> 2 checkins
    // l2 is c2 (Park) -> 1 checkin
    // l3 is c3 (Restaurant) -> 1 checkin
    // l4 is c4 (Bar) -> 0 checkins
    // Total POIs = 4, each has 1 category -> totalCategoryAssignments = 4
    // Each category appears in 1 POI -> catPoiCount = 1
    // IDF for every category = ln(4 / 1) = ln(4) approx 1.386294
    const idf = Math.log(4);

    // u1, c1: TF = 2/4 = 0.5 -> p_u1,c1 = 0.5 * ln(4)
    const p_u1_c1 = output.preferences['u1']['c1'];
    expect(p_u1_c1.value).toBeCloseTo(0.5 * idf, 5);
    expect(p_u1_c1.intermediateValues?.tf).toBeCloseTo(0.5, 5);
    expect(p_u1_c1.intermediateValues?.idf).toBeCloseTo(idf, 5);

    // u1, c2: TF = 1/4 = 0.25 -> p_u1,c2 = 0.25 * ln(4)
    const p_u1_c2 = output.preferences['u1']['c2'];
    expect(p_u1_c2.value).toBeCloseTo(0.25 * idf, 5);

    // u1, c4: TF = 0/4 = 0 -> p_u1,c4 = 0
    const p_u1_c4 = output.preferences['u1']['c4'];
    expect(p_u1_c4.value).toBe(0);

    // Mc_u1 vector
    const vecU1 = output.vectors['u1'];
    expect(vecU1.length).toBe(4);
    expect(vecU1[0]).toBeCloseTo(0.5 * idf, 5);
    expect(vecU1[1]).toBeCloseTo(0.25 * idf, 5);
    expect(vecU1[2]).toBeCloseTo(0.25 * idf, 5);
    expect(vecU1[3]).toBe(0);
  });

  it('should support log10 base option', () => {
    const dataset = {
      ...ORIGINAL_4POI_FIXTURE,
      hyperparameters: {
        ...ORIGINAL_4POI_FIXTURE.hyperparameters,
        logBase: 'log10' as const
      }
    };
    const output = computeCategoryPreferences(dataset);
    const idf10 = Math.log10(4);
    expect(output.preferences['u1']['c1'].value).toBeCloseTo(0.5 * idf10, 5);
  });
});
