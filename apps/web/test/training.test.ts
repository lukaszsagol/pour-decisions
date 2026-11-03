import { describe, expect, it } from 'vitest';
import { solveAuto, verifySolution } from '@pour/engine';
import { getTheme } from '@pour/themes';
import { drinksForRating, nextRating, planningScore, recentScores, trainingLevel } from '../src/training/logic.js';

describe('brain-training logic', () => {
  it('scores planning against the solver best', () => {
    expect(planningScore(true, 13, 13)).toBe(100);
    expect(planningScore(true, 20, 15)).toBe(75);
    expect(planningScore(true, 10, 12)).toBe(100);
    expect(planningScore(false, 10, 12)).toBe(0);
  });

  it('adapts difficulty to results, within bounds', () => {
    expect(nextRating(3, true, 95)).toBe(4);
    expect(nextRating(3, true, 80)).toBe(3);
    expect(nextRating(3, true, 50)).toBe(2);
    expect(nextRating(3, false, 0)).toBe(2);
    expect(nextRating(1, false, 0)).toBe(1);
    expect(nextRating(6, true, 100)).toBe(6);
    expect(drinksForRating(1)).toBe(4);
    expect(drinksForRating(6)).toBe(9);
  });

  it('generates solvable levels, deterministically, and covers them in memory mode', () => {
    const theme = getTheme('amsterdam');
    const a = trainingLevel('planning', theme, 2, 'seed');
    expect(trainingLevel('planning', theme, 2, 'seed')).toEqual(a);
    expect(verifySolution(a.bottles, solveAuto(a.bottles).moves!)).toBe(true);
    const m = trainingLevel('memory', theme, 2, 'seed');
    for (const b of m.bottles) b.units.forEach((u, i) => expect(u.hidden).toBe(i < b.units.length - 1));
    expect(m.best).toBe(a.best);
  });

  it('lists recent scores per mode', () => {
    const s = (mode: 'planning' | 'memory', score: number) => ({
      mode,
      score,
      t: 0,
      won: true,
      moves: 1,
      best: 1,
      msPerPour: 1,
      rating: 1,
    });
    expect(recentScores([s('planning', 50), s('memory', 10), s('planning', 70)], 'planning')).toEqual([50, 70]);
  });
});
