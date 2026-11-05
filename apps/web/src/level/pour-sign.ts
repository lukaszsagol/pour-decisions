import { starsFor, twoStarPours } from '@pour/engine';

/** What the header sign shows during play. */
export interface PourSign {
  /** The big number: pours left for `stars`, or every pour so far once only one star is left. */
  count: number;
  /** The most stars still possible. */
  stars: 1 | 2 | 3;
  /** True once `count` is the total so far instead of a countdown. */
  total: boolean;
}

/**
 * The header counts down to the best result still possible: pours left for three stars (par),
 * then for two, and once only one star is left, the pours so far. The extra glass caps a level
 * at two stars, so after it the countdown is for two.
 */
export function pourSign(moves: number, best: number, extraGlassUsed: boolean, won = false): PourSign {
  // Once won, the sign shows the result: the last pour used up the countdown, it didn't lose a star.
  if (won) {
    const stars = extraGlassUsed ? (Math.min(starsFor(moves, best), 2) as 1 | 2) : starsFor(moves, best);
    return stars === 1 ? { count: moves, stars, total: true } : { count: 0, stars, total: false };
  }
  if (!extraGlassUsed && moves < best) return { count: best - moves, stars: 3, total: false };
  const two = twoStarPours(best);
  if (moves < two) return { count: two - moves, stars: 2, total: false };
  return { count: moves, stars: 1, total: true };
}

/** The sign for screen readers, e.g. "5 pours, par 9: 4 left for three stars". */
export function pourSignLabel(moves: number, best: number, sign: PourSign): string {
  const words = { 1: 'one star', 2: 'two stars', 3: 'three stars' }[sign.stars];
  const pours = `${moves} ${moves === 1 ? 'pour' : 'pours'}, par ${best}`;
  return sign.total ? `${pours}: ${words}` : `${pours}: ${sign.count} left for ${words}`;
}

/** The last three pours of a countdown get louder: 3, 2, then 1 (0 when there is no hurry). */
export function urgency(sign: PourSign): 0 | 1 | 2 | 3 {
  return !sign.total && sign.count <= 3 ? (sign.count as 1 | 2 | 3) : 0;
}

/** What the banner says when a star is lost, e.g. "Three stars gone: 7 pours left for two". */
export function starLossMessage(lost: PourSign, now: PourSign, extraGlassUsed: boolean): string {
  if (lost.stars === 3 && now.stars === 2 && extraGlassUsed && lost.count > 0 && !now.total)
    return `Extra glass: two stars at most now. ${now.count} ${now.count === 1 ? 'pour' : 'pours'} left for two`;
  if (now.stars === 2) return `Three stars gone: ${now.count} ${now.count === 1 ? 'pour' : 'pours'} left for two`;
  return 'Two stars gone: finish for one star';
}
