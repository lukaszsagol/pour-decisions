import { describe, expect, it } from 'vitest';
import {
  canPour,
  isComplete,
  isDeadEnd,
  isWon,
  legalMoves,
  parseBottles,
  pour,
  stateKey,
  topRun,
  validateLevel,
} from '../src/index.js';
import { chained, solved, stuck, tokyo327 } from './fixtures.js';

describe('pour rule', () => {
  it('pours onto the same drink or into an empty bottle', () => {
    const b = parseBottles(['red blue', 'red', ''], 4);
    expect(canPour(b, { from: 0, to: 1 })).toBe(false);
    expect(canPour(b, { from: 0, to: 2 })).toBe(true);
    expect(canPour(b, { from: 1, to: 0 })).toBe(false);
  });

  it('moves the whole top run, limited by free space', () => {
    const b = parseBottles(['red blue blue blue', 'yellow yellow blue'], 4);
    const { bottles, amount } = pour(b, { from: 0, to: 1 });
    expect(amount).toBe(1);
    expect(bottles[0]!.units.map((u) => u.drink)).toEqual(['red', 'blue', 'blue']);
    expect(bottles[1]!.units).toHaveLength(4);
  });

  it('measures the top run', () => {
    const [b] = parseBottles(['red blue blue']);
    expect(topRun(b!)).toBe(2);
  });

  it('refuses full targets and pouring into itself', () => {
    const b = parseBottles(['red red red red', 'red'], 4);
    expect(canPour(b, { from: 1, to: 0 })).toBe(false);
    expect(canPour(b, { from: 0, to: 0 })).toBe(false);
  });

  it('throws on an illegal pour', () => {
    expect(() => pour(stuck(), { from: 0, to: 1 })).toThrow();
  });

  it('does not mutate its input', () => {
    const b = parseBottles(['red blue', ''], 4);
    const before = JSON.stringify(b);
    pour(b, { from: 0, to: 1 });
    expect(JSON.stringify(b)).toBe(before);
  });
});

describe('blockers', () => {
  it('only-bottles accept just their drink', () => {
    const b = tokyo327();
    // bottle 1 has yuzu on top, bottle 0 has ramune on top; bottle 5 only takes yuzu
    expect(canPour(b, { from: 1, to: 5 })).toBe(true);
    expect(canPour(b, { from: 0, to: 5 })).toBe(false);
  });

  it('hidden units reveal when they reach the top', () => {
    let b = parseBottles(['?red blue', ''], 4);
    expect(b[0]!.units[0]!.hidden).toBe(true);
    b = pour(b, { from: 0, to: 1 }).bottles;
    expect(b[0]!.units[0]!.hidden).toBe(false);
  });

  it('locked bottles cannot be used until their drink is complete', () => {
    let b = chained();
    expect(canPour(b, { from: 0, to: 3 })).toBe(false);
    // Completing cherry releases the chain.
    b = parseBottles(['cherry cherry cherry', 'cherry', '', ''], 4, { 3: { lockedUntil: 'cherry' } });
    b = pour(b, { from: 1, to: 0 }).bottles;
    expect(isComplete(b[0]!)).toBe(true);
    expect(b[3]!.lockedUntil).toBeUndefined();
  });
});

describe('end states', () => {
  it('recognises a won position', () => {
    expect(isWon(solved())).toBe(true);
  });

  it('recognises a dead end', () => {
    expect(isDeadEnd(stuck())).toBe(true);
    expect(legalMoves(stuck())).toHaveLength(0);
  });

  it('does not count a still-locked bottle as won', () => {
    const b = parseBottles(['red red', ''], 2, { 1: { lockedUntil: 'blue' } });
    expect(isWon(b)).toBe(false);
  });
});

describe('state key', () => {
  it('ignores bottle order', () => {
    const a = parseBottles(['red blue', 'blue red', '']);
    const b = parseBottles(['', 'blue red', 'red blue']);
    expect(stateKey(a)).toBe(stateKey(b));
  });
});

describe('validation', () => {
  it('accepts the Tokyo level', () => {
    expect(validateLevel(tokyo327())).toEqual([]);
  });

  it('reports wrong drink counts', () => {
    expect(validateLevel(parseBottles(['red red red', 'blue'], 4)).length).toBeGreaterThan(0);
  });
});
