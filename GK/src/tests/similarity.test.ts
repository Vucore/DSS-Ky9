import { describe, it, expect } from 'vitest';
import { INITIAL_MOCK_DATASET } from '../data/mockDataset';
import { computeCategoryPreferences } from '../algorithm/categoryPreference';
import { computeTimePreferences } from '../algorithm/timePreference';
import { computeGroupPreference } from '../algorithm/groupPreference';
import { computeGroupUserSimilarity, cosineSimilarity } from '../algorithm/similarity';

describe('Step 4: Group/User Similarity (Eq 10, 11, 12, 13)', () => {
  it('should compute valid cosine similarity', () => {
    const res = cosineSimilarity([1, 0], [1, 0]);
    expect(res.cosine).toBe(1);

    const resOrth = cosineSimilarity([1, 0], [0, 1]);
    expect(resOrth.cosine).toBe(0);
  });

  it('should compute simM, simU, paper sum, and apply theta threshold', () => {
    const step1 = computeCategoryPreferences(INITIAL_MOCK_DATASET);
    const step2 = computeTimePreferences(INITIAL_MOCK_DATASET, step1);
    const step3 = computeGroupPreference(INITIAL_MOCK_DATASET, step2);
    const step4 = computeGroupUserSimilarity(INITIAL_MOCK_DATASET, step2, step3);

    // Check user u1, u2, u3 (group members themselves have high similarity)
    expect(step4.similarities['u1'].simM.value).toBeGreaterThan(0.7);
    expect(step4.similarities['u1'].simU.value).toBeGreaterThan(0.6);
    expect(step4.similarities['u1'].passedThreshold).toBe(true);
    expect(step4.similarities['u1'].finalSim).toBe(step4.similarities['u1'].combinedSim.value);

    // User u4 and u5 are external users similar to group members and pass threshold
    expect(step4.similarities['u4'].passedThreshold).toBe(true);
    expect(step4.similarities['u5'].passedThreshold).toBe(true);
  });

  it('should support normalized average mode', () => {
    const dataset = {
      ...INITIAL_MOCK_DATASET,
      hyperparameters: {
        ...INITIAL_MOCK_DATASET.hyperparameters,
        simMode: 'normalized_avg' as const,
        theta: 0.3
      }
    };
    const step1 = computeCategoryPreferences(dataset);
    const step2 = computeTimePreferences(dataset, step1);
    const step3 = computeGroupPreference(dataset, step2);
    const step4 = computeGroupUserSimilarity(dataset, step2, step3);

    const u1 = step4.similarities['u1'];
    const expected = (u1.simM.value + u1.simU.value) / 2;
    expect(u1.combinedSim.value).toBeCloseTo(expected, 5);
  });
});
