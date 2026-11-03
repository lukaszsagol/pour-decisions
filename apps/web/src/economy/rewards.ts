import { economy, type BoosterKind } from './config.js';

export interface EarnedBooster {
  kind: BoosterKind;
  reason: 'streak' | 'bar' | 'daily';
}

export interface Rewards {
  /** Stars added to the player's total (only improvements on the level count). */
  stars: number;
  /** Win streak after this result. */
  streak: number;
  /** Boosters earned by this result. */
  earned: EarnedBooster[];
}

/** Streak booster for reaching `streak`, if that is a milestone. */
export function streakReward(streak: number): BoosterKind | undefined {
  return economy.streak.find((s) => s.at === streak)?.booster;
}

/**
 * Rewards for a won level. `previousStars` is the player's best on this level
 * before (0 if never won); `streakBefore` the running first-try streak;
 * `barFinished` is true the first time the bar's last level is won.
 */
export function rewardsFor(input: {
  stars: number;
  previousStars: number;
  firstTry: boolean;
  streakBefore: number;
  barFinished: boolean;
}): Rewards {
  const streak = input.firstTry ? input.streakBefore + 1 : 0;
  const earned: EarnedBooster[] = [];
  const s = input.firstTry ? streakReward(streak) : undefined;
  if (s) earned.push({ kind: s, reason: 'streak' });
  if (input.barFinished) for (const kind of economy.barFinished) earned.push({ kind, reason: 'bar' });
  return { stars: Math.max(0, input.stars - input.previousStars), streak, earned };
}
