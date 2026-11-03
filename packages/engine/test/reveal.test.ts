import { describe, expect, it } from 'vitest';
import { parseBottles, solvableForEveryReveal, solveAuto } from '../src/index.js';
import { tokyo327 } from './fixtures.js';

describe('solvable for every reveal', () => {
  it('accepts Tokyo 327, whose two hidden units can be either way round', () => {
    expect(solvableForEveryReveal(tokyo327())).toBe(true);
  });

  it('accepts levels without hidden units when they are solvable', () => {
    expect(solvableForEveryReveal(parseBottles(['a b', 'b a', ''], 2))).toBe(true);
  });

  it('rejects a level where one arrangement of the hidden drinks is stuck', () => {
    // As dealt (c, b at the bottom) it solves; with the hidden pair swapped it cannot.
    const level = parseBottles(['?c a c', '?b a b', 'b a c', ''], 3);
    expect(solveAuto(level).solvable).toBe(true);
    expect(solveAuto(parseBottles(['b a c', 'c a b', 'b a c', ''], 3)).solvable).toBe(false);
    expect(solvableForEveryReveal(level)).toBe(false);
  });
});
