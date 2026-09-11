import { describe, it, expect } from 'vitest';
import { INITIAL_MOCK_DATASET } from '../data/mockDataset';
import { createInitialState, executeAll, invalidateDownstream } from '../algorithm/pipeline';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cssPath = resolve(__dirname, '../index.css');
const cssContent = readFileSync(cssPath, 'utf-8');

describe('Phase 1 - 4: UX Mode, Architecture & Motion Verification', () => {
  it('should support pipeline execution and produce Top-N rankings with case tagging', () => {
    const state = createInitialState(INITIAL_MOCK_DATASET);
    const computed = executeAll(state);

    expect(computed.step7Output).toBeDefined();
    expect(computed.step7Output?.topN.length).toBe(3);
    expect(computed.step7Output?.rankings.length).toBe(6);

    // Both Case 1 and Case 2 are present
    const visited = computed.step7Output?.rankings.filter((r) => r.isSeenByGroup);
    const unvisited = computed.step7Output?.rankings.filter((r) => !r.isSeenByGroup);
    expect(visited?.length).toBe(3);
    expect(unvisited?.length).toBe(3);
  });

  it('should invalidate downstream calculations when dataset is updated and reset trace', () => {
    const state = createInitialState(INITIAL_MOCK_DATASET);
    const computed = executeAll(state);
    expect(computed.step7Output).toBeDefined();

    // Invalidate from step 0 (mimics modifying dataset in Step0 / Configure mode)
    const invalidated = invalidateDownstream(computed, 0);
    expect(invalidated.step1Output).toBeUndefined();
    expect(invalidated.step2Output).toBeUndefined();
    expect(invalidated.step7Output).toBeUndefined();
  });

  it('should have ZERO instances of "transition: all" in index.css and include prefers-reduced-motion', () => {
    // Rule: Must not have transition: all
    expect(cssContent).not.toMatch(/transition:\s*all\b/);

    // Rule: Must declare motion tokens
    expect(cssContent).toContain('--motion-fast');
    expect(cssContent).toContain('--motion-standard');
    expect(cssContent).toContain('--ease-standard');

    // Rule: Must include prefers-reduced-motion
    expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('should contain all required CSS classes for drawer, pipeline map, and accordions', () => {
    expect(cssContent).toContain('.trace-drawer-panel');
    expect(cssContent).toContain('.trace-drawer-backdrop');
    expect(cssContent).toContain('.pipeline-map-container');
    expect(cssContent).toContain('.pipeline-node-btn');
    expect(cssContent).toContain('.recommendation-breakdown-card');
    expect(cssContent).toContain('.mode-switcher-container');
    expect(cssContent).toContain('.invalidation-banner');
  });

  it('should disable trace drawer backdrop on desktop screens to allow uninhibited hover interaction', () => {
    // Backdrop must be hidden/disabled on desktop so mouse hovering over table cells is never obstructed
    expect(cssContent).toMatch(/@media\s*\(min-width:\s*1100px\)\s*\{\s*\.trace-drawer-backdrop\s*\{\s*display:\s*none/);
  });
});
