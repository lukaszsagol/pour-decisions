import { describe, expect, it } from 'vitest';
import { analyse, heuristic, parseBottles, solve, solveAuto, solveBestFirst, verifySolution } from '../src/index.js';
import { chained, solved, stuck, tenDrinks, tiny, tokyo327 } from './fixtures.js';

describe('best-first search', () => {
  it('finds verified solutions to the golden levels', () => {
    for (const level of [tiny(), chained(), tokyo327(), tenDrinks()]) {
      const r = solveBestFirst(level);
      expect(r.solvable).toBe(true);
      expect(verifySolution(level, r.moves!)).toBe(true);
    }
  });

  it('proves a stuck level unsolvable', () => {
    expect(solveBestFirst(stuck())).toMatchObject({ solvable: false, exhaustive: true });
  });

  it('has a zero heuristic only when solved', () => {
    expect(heuristic(solved())).toBe(0);
    expect(heuristic(tokyo327())).toBeGreaterThan(0);
  });
});

describe('automatic solver', () => {
  it('solves the 10-drink, 12-bottle golden level in under 3 seconds', () => {
    const t = performance.now();
    const r = solveAuto(tenDrinks());
    expect(performance.now() - t).toBeLessThan(3000);
    expect(r.solvable).toBe(true);
    expect(verifySolution(tenDrinks(), r.moves!)).toBe(true);
    expect(r.optimal).toBe(true);
    expect(r.moves!.length).toBe(TEN_DRINKS_BEST);
  });

  it('falls back to best-first when breadth-first runs over budget', () => {
    const r = solveAuto(tenDrinks(), { bfsNodes: 100 });
    expect(r.solvable).toBe(true);
    expect(r.optimal).toBe(false);
    expect(verifySolution(tenDrinks(), r.moves!)).toBe(true);
    expect(r.moves!.length).toBeGreaterThanOrEqual(TEN_DRINKS_BEST);
  });

  it('agrees with breadth-first on Tokyo 327', () => {
    expect(solveAuto(tokyo327()).moves!.length).toBe(solve(tokyo327()).moves!.length);
  });
});

describe('analyse', () => {
  it('reports metrics for Tokyo 327', () => {
    const a = analyse(tokyo327());
    expect(a).toMatchObject({ solvable: true, best: 16, optimal: true });
    expect(a.firstMoves).toBeGreaterThan(0);
    expect(a.winningFirstMoves).toBeGreaterThan(0);
    expect(a.winningFirstMoves).toBeLessThanOrEqual(a.firstMoves);
    expect(a.deadEndShare).toBeCloseTo((a.firstMoves - a.winningFirstMoves) / a.firstMoves);
    expect(a.branching).toBeGreaterThan(1);
    expect(a.emptyPours).toBeGreaterThan(0);
  });

  it('counts first moves that lose', () => {
    // Pouring red onto the empty glass wins; pouring blue into it leaves no way out.
    const level = parseBottles(['blue red red', 'red blue blue', ''], 3);
    const a = analyse(level);
    expect(a.solvable).toBe(true);
    expect(a.firstMoves).toBe(2);
  });

  it('reports unsolvable levels', () => {
    expect(analyse(stuck())).toMatchObject({ solvable: false, deadEndShare: 1 });
  });
});

/** Fewest pours for the ten-drink golden level, from breadth-first search. Update only with a reason. */
const TEN_DRINKS_BEST = 31;
