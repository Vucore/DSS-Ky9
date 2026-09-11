import { describe, it, expect } from 'vitest';
import { ORIGINAL_4POI_FIXTURE } from '../data/mockDataset';
import { computeCategoryPreferences } from '../algorithm/categoryPreference';
import { computeTimePreferences } from '../algorithm/timePreference';
import { computeGroupPreference } from '../algorithm/groupPreference';
import { computeGroupUserSimilarity } from '../algorithm/similarity';
import { computeCollaborativeFiltering } from '../algorithm/collaborativeFiltering';

describe('Step 5: Collaborative Filtering (Eq 14)', () => {
  it('should compute fg,l scores for all candidate POIs', () => {
    const step1 = computeCategoryPreferences(ORIGINAL_4POI_FIXTURE);
    const step2 = computeTimePreferences(ORIGINAL_4POI_FIXTURE, step1);
    const step3 = computeGroupPreference(ORIGINAL_4POI_FIXTURE, step2);
    const step4 = computeGroupUserSimilarity(ORIGINAL_4POI_FIXTURE, step2, step3);
    const step5 = computeCollaborativeFiltering(ORIGINAL_4POI_FIXTURE, step4);

    // There are 4 POIs
    expect(Object.keys(step5.cfScores)).toEqual(['l1', 'l2', 'l3', 'l4']);

    for (const poiId of ['l1', 'l2', 'l3', 'l4']) {
      const poiScore = step5.cfScores[poiId];
      expect(poiScore.score).toBeGreaterThanOrEqual(0);
      expect(poiScore.score).toBeLessThanOrEqual(1.0);
      expect(poiScore.denominator).toBeGreaterThan(0);
      expect(poiScore.numerator).toBeLessThanOrEqual(poiScore.denominator);
    }
  });

  it('should handle zero users passing threshold gracefully', () => {
    const step1 = computeCategoryPreferences(ORIGINAL_4POI_FIXTURE);
    const step2 = computeTimePreferences(ORIGINAL_4POI_FIXTURE, step1);
    const step3 = computeGroupPreference(ORIGINAL_4POI_FIXTURE, step2);
    // Setting impossible high threshold
    const dataset = {
      ...ORIGINAL_4POI_FIXTURE,
      hyperparameters: {
        ...ORIGINAL_4POI_FIXTURE.hyperparameters,
        theta: 99.0
      }
    };
    const step4 = computeGroupUserSimilarity(dataset, step2, step3);
    const step5 = computeCollaborativeFiltering(dataset, step4);

    expect(step5.cfScores['l1'].score).toBe(0);
    expect(step5.cfScores['l1'].denominator).toBe(0);
  });
});
