import { describe, it, expect } from 'vitest';
import { ORIGINAL_4POI_FIXTURE } from '../data/mockDataset';
import { computeIntragroupDivergence } from '../algorithm/divergence';

describe('Step 6: Intragroup Divergence (Eq 15, 16)', () => {
  it('should compute delta(u, l) from friend sets Au', () => {
    const step6 = computeIntragroupDivergence(ORIGINAL_4POI_FIXTURE);

    // Group members: u1, u2, u3
    // Friends:
    // A_u1 = [u2, u4] (size 2)
    // A_u2 = [u1, u3, u4] (size 3)
    // A_u3 = [u2, u5] (size 2)

    // Check POI l1:
    // Visited by: u1 (ck1, ck4), u2 (ck5), u4 (ck11)
    // For u1: friends in Au1 are u2, u4. Both u2 and u4 visited l1!
    // -> delta(u1, l1) = 2 / 2 = 1.0
    expect(step6.memberProbabilities['u1']['l1'].delta).toBe(1.0);
    expect(step6.memberProbabilities['u1']['l1'].friendsVisited.sort()).toEqual(['u2', 'u4']);

    // For u2: friends in Au2 are u1, u3, u4.
    // u1 visited l1 (yes), u3 visited l1 (no), u4 visited l1 (yes).
    // -> delta(u2, l1) = 2 / 3 approx 0.66667
    expect(step6.memberProbabilities['u2']['l1'].delta).toBeCloseTo(2 / 3, 5);

    // For u3: friends in Au3 are u2, u5.
    // u2 visited l1 (yes), u5 visited l1 (no).
    // -> delta(u3, l1) = 1 / 2 = 0.5
    expect(step6.memberProbabilities['u3']['l1'].delta).toBe(0.5);
  });

  it('should compute pairwise differences and dg,l for all candidate POIs', () => {
    const step6 = computeIntragroupDivergence(ORIGINAL_4POI_FIXTURE);

    // Group size n = 3. Pairs = (3 * 2) / 2 = 3 pairs:
    // (u1, u2), (u1, u3), (u2, u3)
    // Scaling factor = 2 / (3 * 2) = 1/3
    // For l1:
    // delta(u1)=1.0, delta(u2)=2/3, delta(u3)=1/2
    // |delta1 - delta2| = |1 - 2/3| = 1/3
    // |delta1 - delta3| = |1 - 1/2| = 1/2
    // |delta2 - delta3| = |2/3 - 1/2| = 1/6
    // sum = 1/3 + 1/2 + 1/6 = (2 + 3 + 1)/6 = 6/6 = 1.0
    // d_{g, l1} = (1/3) * 1.0 = 1/3 approx 0.33333
    const divL1 = step6.groupDivergences['l1'];
    expect(divL1.pairs.length).toBe(3);
    expect(divL1.scalingFactor).toBeCloseTo(1 / 3, 5);
    expect(divL1.sumDifferences).toBeCloseTo(1.0, 5);
    expect(divL1.divergence).toBeCloseTo(1 / 3, 5);
  });
});
