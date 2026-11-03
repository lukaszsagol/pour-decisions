import { describe, expect, it } from 'vitest';
import { economy } from '../src/economy/config.js';
import { rewardsFor, streakReward, winCoins } from '../src/economy/rewards.js';

describe('win rewards', () => {
  it('pays 20 coins plus 10 per star above one, doubled on Hard and tripled on Super Hard', () => {
    expect(winCoins(1, 'normal')).toBe(20);
    expect(winCoins(3, 'normal')).toBe(40);
    expect(winCoins(3, 'hard')).toBe(80);
    expect(winCoins(2, 'superHard')).toBe(90);
  });

  it('counts only star improvements', () => {
    expect(
      rewardsFor({ stars: 3, difficulty: 'normal', previousStars: 2, firstTry: true, streakBefore: 0 }).stars,
    ).toBe(1);
    expect(
      rewardsFor({ stars: 1, difficulty: 'normal', previousStars: 2, firstTry: true, streakBefore: 0 }).stars,
    ).toBe(0);
  });

  it('rewards streaks of 3, 5 and 10 and resets on a retry', () => {
    expect(streakReward(3)).toBe('undo');
    expect(streakReward(5)).toBe('extraGlass');
    expect(streakReward(10)).toBe('hint');
    expect(streakReward(4)).toBeUndefined();
    const r = rewardsFor({ stars: 3, difficulty: 'normal', previousStars: 0, firstTry: true, streakBefore: 2 });
    expect(r).toMatchObject({ streak: 3, streakBooster: 'undo' });
    expect(
      rewardsFor({ stars: 3, difficulty: 'normal', previousStars: 0, firstTry: false, streakBefore: 9 }).streak,
    ).toBe(0);
  });

  it('starts a new player with the spec stock', () => {
    expect(economy.start).toEqual({ undo: 5, extraGlass: 2, hint: 3, coins: 300 });
  });
});
