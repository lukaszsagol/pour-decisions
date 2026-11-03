import { describe, expect, it } from 'vitest';
import { botWinRate, createRng, difficulty, playBot } from '../src/index.js';
import { stuck, tenDrinks, tiny, tokyo327 } from './fixtures.js';

describe('bot player', () => {
  it('wins easy levels and loses stuck ones', () => {
    expect(playBot(tiny(), createRng(1)).won).toBe(true);
    expect(playBot(stuck(), createRng(1))).toEqual({ won: false, moves: 0 });
  });

  it('wins less often when it makes more mistakes', () => {
    const careful = botWinRate(tokyo327(), 100, 's', { mistakeRate: 0 });
    const sloppy = botWinRate(tokyo327(), 100, 's', { mistakeRate: 0.6 });
    expect(careful).toBeGreaterThan(sloppy);
  });

  it('is deterministic for a seed', () => {
    expect(botWinRate(tokyo327(), 50, 'x')).toBe(botWinRate(tokyo327(), 50, 'x'));
  });
});

describe('difficulty score', () => {
  it('scores easy golden levels below Tokyo 327, and the ten-drink level above it', () => {
    const easy = difficulty(tiny()).score;
    const tokyo = difficulty(tokyo327()).score;
    const big = difficulty(tenDrinks(), { runs: 100 }).score;
    expect(easy).toBeLessThan(tokyo);
    expect(tokyo).toBeLessThan(big);
  });

  it('is deterministic and banded', () => {
    const a = difficulty(tokyo327(), { seed: 'k' });
    const b = difficulty(tokyo327(), { seed: 'k' });
    expect(a.score).toBe(b.score);
    expect(a.score).toBeGreaterThanOrEqual(0);
    expect(a.score).toBeLessThanOrEqual(100);
    expect(['easy', 'normal', 'hard', 'superHard']).toContain(a.band);
    expect(difficulty(tiny()).band).toBe('easy');
  });
});
