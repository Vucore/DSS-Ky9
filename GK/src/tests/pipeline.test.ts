import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  executeStep,
  executeAll,
  invalidateDownstream,
  canExecuteStep,
  getStepStatuses
} from '../algorithm/pipeline';
import { INITIAL_MOCK_DATASET } from '../data/mockDataset';

describe('Full Pipeline Integration & Invalidation', () => {
  it('should run end-to-end pipeline deterministically with executeAll', async () => {
    const initialState = createInitialState(INITIAL_MOCK_DATASET);
    expect(initialState.currentStepId).toBe(0);

    const finalState = executeAll(initialState);

    expect(finalState.step1Output).toBeDefined();
    expect(finalState.step2Output).toBeDefined();
    expect(finalState.step3Output).toBeDefined();
    expect(finalState.step4Output).toBeDefined();
    expect(finalState.step5Output).toBeDefined();
    expect(finalState.step6Output).toBeDefined();
    expect(finalState.step7Output).toBeDefined();

    const topN = finalState.step7Output!.topN;
    expect(topN.length).toBe(3);
    expect(topN[0].poiId).toBeDefined();
    expect(topN[0].finalScore).toBeGreaterThanOrEqual(topN[1].finalScore);
  });

  it('should enforce step execution order and dependencies', () => {
    const state = createInitialState(INITIAL_MOCK_DATASET);

    // Step 2 cannot run without Step 1
    expect(canExecuteStep(state, 2)).toBe(false);
    expect(() => executeStep(state, 2)).toThrow();

    // Step 1 can run
    expect(canExecuteStep(state, 1)).toBe(true);
    const stateAfterStep1 = executeStep(state, 1);
    expect(stateAfterStep1.step1Output).toBeDefined();

    // Now Step 2 can run
    expect(canExecuteStep(stateAfterStep1, 2)).toBe(true);
    const stateAfterStep2 = executeStep(stateAfterStep1, 2);
    expect(stateAfterStep2.step2Output).toBeDefined();
  });

  it('should invalidate downstream outputs when upstream changes', () => {
    const state = executeAll(createInitialState(INITIAL_MOCK_DATASET));
    expect(state.step7Output).toBeDefined();

    // Invalidate from Step 3
    const invalidatedFrom3 = invalidateDownstream(state, 3);
    expect(invalidatedFrom3.step1Output).toBeDefined();
    expect(invalidatedFrom3.step2Output).toBeDefined();
    expect(invalidatedFrom3.step3Output).toBeDefined();
    expect(invalidatedFrom3.step4Output).toBeUndefined();
    expect(invalidatedFrom3.step5Output).toBeUndefined();
    expect(invalidatedFrom3.step7Output).toBeUndefined();

    // Invalidate from Step 0 (dataset edit)
    const invalidatedFrom0 = invalidateDownstream(state, 0);
    expect(invalidatedFrom0.step1Output).toBeUndefined();
    expect(invalidatedFrom0.step2Output).toBeUndefined();
    expect(invalidatedFrom0.step3Output).toBeUndefined();
    expect(invalidatedFrom0.step4Output).toBeUndefined();
    expect(invalidatedFrom0.step5Output).toBeUndefined();
    expect(invalidatedFrom0.step6Output).toBeUndefined();
    expect(invalidatedFrom0.step7Output).toBeUndefined();
  });

  it('should reflect status flags accurately in getStepStatuses', () => {
    let state = createInitialState(INITIAL_MOCK_DATASET);
    let statuses = getStepStatuses(state);

    expect(statuses[0].isCompleted).toBe(true);
    expect(statuses[1].canRun).toBe(true);
    expect(statuses[1].isCompleted).toBe(false);
    expect(statuses[2].canRun).toBe(false);

    state = executeStep(state, 1);
    statuses = getStepStatuses(state);
    expect(statuses[1].isCompleted).toBe(true);
    expect(statuses[2].canRun).toBe(true);
  });
});
