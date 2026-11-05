import { describe, expect, it } from 'vitest';
import { colourBreaks, createRng, deal, drinkCounts, isComplete, longestRun, validateLevel } from '../src/index.js';

describe('seeded random numbers', () => {
  it('gives the same sequence for the same seed', () => {
    const a = createRng('amsterdam-1');
    const b = createRng('amsterdam-1');
    const xs = Array.from({ length: 20 }, () => a.next());
    expect(Array.from({ length: 20 }, () => b.next())).toEqual(xs);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it('gives different sequences for different seeds', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('is roughly uniform', () => {
    const r = createRng('uniform');
    const buckets = [0, 0, 0, 0];
    for (let i = 0; i < 8000; i++) buckets[r.int(4)]!++;
    for (const n of buckets) expect(n).toBeGreaterThan(1800);
  });

  it('shuffles without losing items', () => {
    const r = createRng('shuffle');
    expect(r.shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('dealer', () => {
  const drinks = ['jenever', 'advocaat', 'cherry', 'oranjebitter', 'curacao'];

  it('is deterministic', () => {
    expect(deal({ drinks, seed: 'x' })).toEqual(deal({ drinks, seed: 'x' }));
    expect(deal({ drinks, seed: 'x' })).not.toEqual(deal({ drinks, seed: 'y' }));
  });

  it('holds its constraints over 1 000 seeds', () => {
    for (let s = 0; s < 1000; s++) {
      const n = 2 + (s % 6);
      const capacity = 3 + (s % 3);
      const bottles = deal({ drinks: drinks.concat(['a', 'b', 'c']).slice(0, n), capacity, empties: 2, seed: s });
      expect(validateLevel(bottles)).toEqual([]);
      expect(bottles).toHaveLength(n + 2);
      const counts = drinkCounts(bottles);
      expect([...counts.values()].every((c) => c === capacity)).toBe(true);
      expect(bottles.some(isComplete)).toBe(false);
      expect(bottles.every((b) => longestRun(b) <= 2)).toBe(true);
      expect(bottles.slice(-2).every((b) => b.units.length === 0)).toBe(true);
    }
  });

  it('respects a tighter run cap and fragmentation', () => {
    const bottles = deal({ drinks, seed: 'frag', constraints: { maxRun: 1, minBreaks: 14 } });
    expect(bottles.every((b) => longestRun(b) <= 1)).toBe(true);
    expect(colourBreaks(bottles)).toBeGreaterThanOrEqual(14);
  });

  it('refuses impossible requests', () => {
    expect(() => deal({ drinks: ['a'], seed: 1 })).toThrow();
    expect(() => deal({ drinks, seed: 1, capacity: 2, constraints: { maxRun: 2 } })).toThrow();
  });
});

describe('spread deals', () => {
  const drinks = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

  it('shares the spare space out so no glass starts empty', () => {
    for (let s = 0; s < 30; s++) {
      const bottles = deal({ drinks, empties: 2, spread: 2, seed: `spread-${s}` });
      expect(bottles).toHaveLength(9);
      expect(bottles.every((b) => b.units.length >= 1)).toBe(true);
      expect(bottles.reduce((n, b) => n + b.units.length, 0)).toBe(28);
      expect(bottles.some((b) => b.units.length < 4)).toBe(true);
    }
  });

  it('can keep one glass empty and spread the other', () => {
    const bottles = deal({ drinks, empties: 2, spread: 1, seed: 'one-empty' });
    expect(bottles).toHaveLength(9);
    expect(bottles.filter((b) => b.units.length === 0)).toHaveLength(1);
  });

  it('deals exactly as before without spread', () => {
    const a = deal({ drinks, empties: 2, seed: 'same' });
    const b = deal({ drinks, empties: 2, spread: 0, seed: 'same' });
    expect(b).toEqual(a);
    expect(a.filter((x) => x.units.length === 0)).toHaveLength(2);
  });
});
