import { describe, expect, it } from 'vitest';
import { verifySolution, solveAuto } from '@pour/engine';
import { dailyLevel, dailyShareText, dateKey, shortDate } from '../src/daily/generate.js';

describe('daily pour', () => {
  it('is the same level for everyone on a date, and solvable', () => {
    const a = dailyLevel('2026-11-03');
    const b = dailyLevel('2026-11-03');
    expect(a.bottles).toEqual(b.bottles);
    expect(a.best).toBe(b.best);
    const r = solveAuto(a.bottles);
    expect(verifySolution(a.bottles, r.moves!)).toBe(true);
  });

  it('changes from day to day and stays medium', () => {
    const days = ['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'].map(dailyLevel);
    expect(new Set(days.map((d) => JSON.stringify(d.bottles))).size).toBe(4);
    expect(new Set(days.map((d) => d.theme.id)).size).toBe(4);
    for (const d of days) {
      expect(d.best).toBeGreaterThanOrEqual(14);
      expect(d.best).toBeLessThanOrEqual(34);
    }
  });

  it('formats dates and the share text', () => {
    expect(dateKey(new Date(2026, 10, 3))).toBe('2026-11-03');
    expect(shortDate('2026-11-03')).toBe('3 Nov');
    expect(dailyShareText('2026-11-03', 3, 14, 13)).toBe('Pour Decisions · 3 Nov · ★★★ 14 moves (best 13)');
  });
});
