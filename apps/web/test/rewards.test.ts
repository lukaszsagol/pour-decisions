import { describe, expect, it } from 'vitest';
import { economy } from '../src/economy/config.js';
import { rewardsFor, streakReward } from '../src/economy/rewards.js';

const win = (o: Partial<Parameters<typeof rewardsFor>[0]> = {}) =>
  rewardsFor({ stars: 3, previousStars: 0, firstTry: true, streakBefore: 0, barFinished: false, ...o });

describe('rewards', () => {
  it('counts only star improvements', () => {
    expect(win({ previousStars: 2 }).stars).toBe(1);
    expect(win({ stars: 1, previousStars: 2 }).stars).toBe(0);
  });

  it('gives a booster at streaks of 3, 5 and 10, and resets on a retry', () => {
    expect(streakReward(3)).toBe('undo');
    expect(streakReward(5)).toBe('extraGlass');
    expect(streakReward(10)).toBe('hint');
    expect(streakReward(4)).toBeUndefined();
    expect(win({ streakBefore: 2 })).toMatchObject({ streak: 3, earned: [{ kind: 'undo', reason: 'streak' }] });
    expect(win({ firstTry: false, streakBefore: 9 })).toMatchObject({ streak: 0, earned: [] });
  });

  it('gives one of each booster for finishing a bar', () => {
    expect(win({ barFinished: true }).earned.map((e) => e.kind)).toEqual(['undo', 'extraGlass', 'hint']);
  });

  it('has no currency: a new player starts with boosters only', () => {
    expect(economy.start).toEqual({ undo: 5, extraGlass: 2, hint: 3 });
  });
});
