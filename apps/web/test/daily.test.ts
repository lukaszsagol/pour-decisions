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

describe('daily screen helpers', () => {
  it('counts nights in a row, from tonight or from last night', async () => {
    const { nightsInARow } = await import('../src/daily/screen.js');
    const today = new Date(2026, 10, 3, 20);
    expect(nightsInARow({}, today)).toBe(0);
    expect(nightsInARow({ '2026-11-03': 1, '2026-11-02': 1, '2026-10-31': 1 }, today)).toBe(2);
    expect(nightsInARow({ '2026-11-02': 1, '2026-11-01': 1 }, today)).toBe(2);
    expect(nightsInARow({ '2026-11-01': 1 }, today)).toBe(0);
  });

  it('counts down to midnight', async () => {
    const { untilMidnight } = await import('../src/daily/screen.js');
    expect(untilMidnight(new Date(2026, 10, 3, 18, 48))).toBe('5 h 12 min');
    expect(untilMidnight(new Date(2026, 10, 3, 23, 50))).toBe('10 min');
  });
});
