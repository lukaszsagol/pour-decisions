import { describe, expect, it } from 'vitest';
import { solve, verifySolution } from '../src/index.js';
import { chained, solved, stuck, tiny, tokyo327 } from './fixtures.js';

describe('solver', () => {
  it('returns no moves for a solved level', () => {
    expect(solve(solved())).toMatchObject({ solvable: true, moves: [] });
  });

  it('proves an unsolvable level', () => {
    expect(solve(stuck())).toMatchObject({ solvable: false, exhaustive: true });
  });

  it('solves a tiny level with a verified solution', () => {
    const r = solve(tiny());
    expect(r.solvable).toBe(true);
    expect(verifySolution(tiny(), r.moves!)).toBe(true);
  });

  it('solves a level with a chained bottle', () => {
    const r = solve(chained());
    expect(r.solvable).toBe(true);
    expect(verifySolution(chained(), r.moves!)).toBe(true);
  });

  it('finds the optimum for Tokyo level 327', () => {
    const r = solve(tokyo327());
    expect(r.solvable).toBe(true);
    expect(verifySolution(tokyo327(), r.moves!)).toBe(true);
    // Hand solution from the design used 17 pours; the solver must match or beat it.
    expect(r.moves!.length).toBeLessThanOrEqual(17);
    expect(r.moves!.length).toBe(TOKYO_327_BEST);
  });

  it('stops at its node budget', () => {
    const r = solve(tokyo327(), { maxNodes: 5 });
    expect(r.exhaustive).toBe(false);
  });
});

/** Fewest pours for Tokyo 327, recorded from the solver. Update only with a reason. */
const TOKYO_327_BEST = 16;
