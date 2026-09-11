import { describe, it, expect } from 'vitest';
import { ORIGINAL_4POI_FIXTURE } from '../data/mockDataset';
import { computeCategoryPreferences } from '../algorithm/categoryPreference';
import { computeTimePreferences, getTimeSlot } from '../algorithm/timePreference';

describe('Step 2: User Time Preference (Eq 4, 5, 6)', () => {
  it('should correctly map hours to time slots', () => {
    expect(getTimeSlot(7)).toBe('T1');
    expect(getTimeSlot(12)).toBe('T1');
    expect(getTimeSlot(13)).toBe('T2');
    expect(getTimeSlot(18)).toBe('T2');
    expect(getTimeSlot(19)).toBe('T3');
    expect(getTimeSlot(23)).toBe('T3');
    expect(getTimeSlot(1)).toBe('T4');
    expect(getTimeSlot(4)).toBe('T4');
  });

  it('should compute exact time preferences and concatenate Mu', () => {
    const step1Output = computeCategoryPreferences(ORIGINAL_4POI_FIXTURE);
    const output = computeTimePreferences(ORIGINAL_4POI_FIXTURE, step1Output);

    // u1 (Alice):
    // ck1: Wed 09:00 -> T1, weekday
    // ck2: Sat 14:00 -> T2, weekend
    // ck3: Thu 20:00 -> T3, weekday
    // ck4: Sun 10:00 -> T1, weekend
    // T1: 2, T2: 1, T3: 1, T4: 0, Total = 4. Weekend = 2
    const u1Time = output.timePreferences['u1'];
    expect(u1Time.slotCounts).toEqual({ T1: 2, T2: 1, T3: 1, T4: 0 });
    expect(u1Time.weekendCount).toBe(2);
    expect(u1Time.vectorMt).toEqual([0.5, 0.25, 0.25, 0, 0.5]);

    // Combined Mu for u1 has 4 category features + 5 time features = 9 features
    const u1Vec = output.userVectors['u1'];
    expect(u1Vec.combinedMu.length).toBe(9);
    expect(u1Vec.combinedMu.slice(4)).toEqual([0.5, 0.25, 0.25, 0, 0.5]);

    // u5 (Eve):
    // ck14: Wed 03:00 -> T4, weekday
    // ck15: Fri 04:00 -> T4, weekday
    // T1: 0, T2: 0, T3: 0, T4: 2, Weekend = 0
    const u5Time = output.timePreferences['u5'];
    expect(u5Time.slotCounts).toEqual({ T1: 0, T2: 0, T3: 0, T4: 2 });
    expect(u5Time.weekendCount).toBe(0);
    expect(u5Time.vectorMt).toEqual([0, 0, 0, 1.0, 0]);
  });
});
