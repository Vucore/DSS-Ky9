import { describe, it, expect } from 'vitest';
import katex from 'katex';
import { INITIAL_MOCK_DATASET } from '../data/mockDataset';
import { computeCategoryPreferences } from '../algorithm/categoryPreference';
import { computeTimePreferences } from '../algorithm/timePreference';
import { computeGroupPreference } from '../algorithm/groupPreference';
import { computeGroupUserSimilarity } from '../algorithm/similarity';
import { computeCollaborativeFiltering } from '../algorithm/collaborativeFiltering';
import { computeIntragroupDivergence } from '../algorithm/divergence';
import { computeFinalRanking } from '../algorithm/finalScore';

describe('KaTeX Substituted Arithmetic Expressions Validation', () => {
  const dataset = INITIAL_MOCK_DATASET;

  it('Step 1: Category Preferences should generate valid KaTeX expressionLatex for all users and categories', () => {
    const step1 = computeCategoryPreferences(dataset);
    for (const user of dataset.users) {
      for (const cat of dataset.categories) {
        const trace = step1.preferences[user.id]?.[cat.id];
        expect(trace).toBeDefined();
        expect(trace.expressionLatex).toBeDefined();
        expect(trace.expressionLatex!.length).toBeGreaterThan(0);

        expect(() => {
          katex.renderToString(trace.expressionLatex!, { throwOnError: true, strict: false });
        }).not.toThrow();
      }
    }
  });

  it('Step 2: Time Preferences should generate valid KaTeX expressionLatex for all slots (T1-T5)', () => {
    const step1 = computeCategoryPreferences(dataset);
    const step2 = computeTimePreferences(dataset, step1);
    for (const user of dataset.users) {
      const uTime = step2.timePreferences[user.id];
      expect(uTime).toBeDefined();
      for (const slotKey of ['T1', 'T2', 'T3', 'T4', 'T5'] as const) {
        const trace = uTime.traces[slotKey];
        expect(trace).toBeDefined();
        expect(trace.expressionLatex).toBeDefined();
        expect(() => {
          katex.renderToString(trace.expressionLatex!, { throwOnError: true, strict: false });
        }).not.toThrow();
      }
    }
  });

  it('Step 3: Group Preferences should generate valid KaTeX expressionLatex for member affinities and group features', () => {
    const step1 = computeCategoryPreferences(dataset);
    const step2 = computeTimePreferences(dataset, step1);
    const step3 = computeGroupPreference(dataset, step2);

    // Member affinities (Eq. 7)
    for (const memId of dataset.groups[0].memberUserIds) {
      const aff = step3.memberAffinities[memId];
      expect(aff.trace.expressionLatex).toBeDefined();
      expect(() => {
        katex.renderToString(aff.trace.expressionLatex!, { throwOnError: true, strict: false });
      }).not.toThrow();
    }

    // Group features (Eq. 8)
    for (const tr of step3.groupVectorMg.traces) {
      expect(tr.expressionLatex).toBeDefined();
      expect(() => {
        katex.renderToString(tr.expressionLatex!, { throwOnError: true, strict: false });
      }).not.toThrow();
    }
  });

  it('Step 4: Group-User Similarities should generate valid KaTeX expressionLatex for all traces (Eq 10, 11, 12, 13)', () => {
    const step1 = computeCategoryPreferences(dataset);
    const step2 = computeTimePreferences(dataset, step1);
    const step3 = computeGroupPreference(dataset, step2);
    const step4 = computeGroupUserSimilarity(dataset, step2, step3);

    for (const user of dataset.users) {
      const sim = step4.similarities[user.id];
      expect(sim).toBeDefined();

      // Eq 10 (simM)
      expect(sim.simM.expressionLatex).toBeDefined();
      expect(() => {
        katex.renderToString(sim.simM.expressionLatex!, { throwOnError: true, strict: false });
      }).not.toThrow();

      // Eq 11 (simU)
      expect(sim.simU.expressionLatex).toBeDefined();
      expect(() => {
        katex.renderToString(sim.simU.expressionLatex!, { throwOnError: true, strict: false });
      }).not.toThrow();

      // Eq 12 (combined)
      expect(sim.combinedSim.expressionLatex).toBeDefined();
      expect(() => {
        katex.renderToString(sim.combinedSim.expressionLatex!, { throwOnError: true, strict: false });
      }).not.toThrow();

      // Eq 13 (threshold)
      expect(sim.thresholdTrace.expressionLatex).toBeDefined();
      expect(() => {
        katex.renderToString(sim.thresholdTrace.expressionLatex!, { throwOnError: true, strict: false });
      }).not.toThrow();
    }
  });

  it('Step 5: Collaborative Filtering should generate valid KaTeX expressionLatex for all POIs', () => {
    const step1 = computeCategoryPreferences(dataset);
    const step2 = computeTimePreferences(dataset, step1);
    const step3 = computeGroupPreference(dataset, step2);
    const step4 = computeGroupUserSimilarity(dataset, step2, step3);
    const step5 = computeCollaborativeFiltering(dataset, step4);

    for (const poi of dataset.pois) {
      const cf = step5.cfScores[poi.id];
      expect(cf).toBeDefined();
      expect(cf.trace.expressionLatex).toBeDefined();
      expect(() => {
        katex.renderToString(cf.trace.expressionLatex!, { throwOnError: true, strict: false });
      }).not.toThrow();
    }
  });

  it('Step 6: Intragroup Divergence should generate valid KaTeX expressionLatex for member deltas and group divergences', () => {
    const step6 = computeIntragroupDivergence(dataset);

    // Eq 16 (delta)
    for (const memId of dataset.groups[0].memberUserIds) {
      for (const poi of dataset.pois) {
        const tr = step6.memberProbabilities[memId]?.[poi.id]?.trace;
        expect(tr?.expressionLatex).toBeDefined();
        expect(() => {
          katex.renderToString(tr!.expressionLatex!, { throwOnError: true, strict: false });
        }).not.toThrow();
      }
    }

    // Eq 15 (divergence)
    for (const poi of dataset.pois) {
      const div = step6.groupDivergences[poi.id];
      expect(div?.trace.expressionLatex).toBeDefined();
      expect(() => {
        katex.renderToString(div!.trace.expressionLatex!, { throwOnError: true, strict: false });
      }).not.toThrow();
    }
  });

  it('Step 7: Final Score should generate valid KaTeX expressionLatex for all rankings', () => {
    const step1 = computeCategoryPreferences(dataset);
    const step2 = computeTimePreferences(dataset, step1);
    const step3 = computeGroupPreference(dataset, step2);
    const step4 = computeGroupUserSimilarity(dataset, step2, step3);
    const step5 = computeCollaborativeFiltering(dataset, step4);
    const step6 = computeIntragroupDivergence(dataset);
    const step7 = computeFinalRanking(dataset, step5, step6);

    for (const item of step7.rankings) {
      expect(item.trace.expressionLatex).toBeDefined();
      expect(() => {
        katex.renderToString(item.trace.expressionLatex!, { throwOnError: true, strict: false });
      }).not.toThrow();
    }
  });
});
