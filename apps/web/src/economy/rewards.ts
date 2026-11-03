import type { Difficulty } from '@pour/engine';
import { economy, type BoosterKind } from './config.js';

export interface Rewards {
  coins: number;
  /** Stars added to the player's total (only improvements on the level count). */
  stars: number;
  /** Win streak after this result. */
  streak: number;
  /** Booster earned by reaching a streak milestone. */
  streakBooster?: BoosterKind;
}

/** Coins for a win: base, plus per star above one, times the Hard / Super Hard multiplier. */
export function winCoins(stars: number, difficulty: Difficulty): number {
  const w = economy.win;
  return (w.coins + w.perStarAboveOne * Math.max(0, stars - 1)) * w.multiplier[difficulty];
}

/** Streak booster for reaching `streak`, if that is a milestone. */
export function streakReward(streak: number): BoosterKind | undefined {
  return economy.streak.find((s) => s.at === streak)?.booster;
}

/**
 * Rewards for a won level. `previousStars` is the player's best on this level
 * before (0 if never won); `streakBefore` the running first-try streak.
 */
export function rewardsFor(input: {
  stars: number;
  difficulty: Difficulty;
  previousStars: number;
  firstTry: boolean;
  streakBefore: number;
}): Rewards {
  const streak = input.firstTry ? input.streakBefore + 1 : 0;
  const booster = input.firstTry ? streakReward(streak) : undefined;
  return {
    coins: winCoins(input.stars, input.difficulty),
    stars: Math.max(0, input.stars - input.previousStars),
    streak,
    ...(booster ? { streakBooster: booster } : {}),
  };
}
