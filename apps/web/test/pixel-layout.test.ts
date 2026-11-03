import { describe, expect, it } from 'vitest';
import { artLayout, rowPlan } from '../src/pixel/level/layout.js';

describe('pixel glass layout', () => {
  it('matches the reference positions for seven glasses', () => {
    const { slots, interior } = artLayout(7);
    expect(slots.map((s) => [s.x, s.y])).toEqual([
      [26, 117],
      [65, 117],
      [104, 117],
      [143, 117],
      [46, 228],
      [85, 228],
      [124, 228],
    ]);
    expect(interior).toBe(22);
  });

  it('puts up to 13 glasses in two rows that fit the 195 px width', () => {
    for (let n = 2; n <= 13; n++) {
      const { slots } = artLayout(n);
      expect(slots).toHaveLength(n);
      expect(new Set(slots.map((s) => s.y)).size).toBeLessThanOrEqual(2);
      for (const s of slots) {
        expect(s.x - 2).toBeGreaterThanOrEqual(0);
        expect(s.x + 28).toBeLessThanOrEqual(195);
      }
      // Rows never overlap: neighbours are at least a glass apart.
      const row1 = slots.filter((s) => s.y === slots[0]!.y).map((s) => s.x);
      for (let i = 1; i < row1.length; i++)
        expect(row1[i]! - row1[i - 1]!).toBeGreaterThanOrEqual(rowPlan(n).interior + 5);
    }
  });

  it('narrows the glass only when seven share a row', () => {
    expect(rowPlan(12).interior).toBe(22);
    expect(rowPlan(13).interior).toBe(18);
  });
});
