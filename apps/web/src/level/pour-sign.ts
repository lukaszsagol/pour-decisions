import { twoStarPours } from '@pour/engine';

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
export function pourSign(moves: number, best: number, extraGlassUsed: boolean): PourSign {
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
