import type { Bottle, DrinkId } from './types.js';

/**
 * Compact level notation for tests and hand-made levels.
 *
 * One string per bottle, units bottom to top separated by spaces.
 * Prefix a unit with "?" to hide it. An empty string is an empty bottle.
 *
 *   parseBottles(["umeshu sakura melon ramune", "?melon ?yuzu sakura umeshu", ""])
 */
export function parseBottles(
  rows: string[],
  capacity = 4,
  extras: Record<number, { only?: DrinkId; lockedUntil?: DrinkId }> = {},
): Bottle[] {
  return rows.map((row, i) => {
    const units = row
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => ({ drink: token.replace(/^\?/, ''), hidden: token.startsWith('?') }));
    return { units, capacity, ...extras[i] };
  });
}

/** Inverse of parseBottles, handy for snapshots and debugging. */
export function formatBottles(bottles: readonly Bottle[]): string[] {
  return bottles.map((b) => b.units.map((u) => (u.hidden ? `?${u.drink}` : u.drink)).join(' '));
}
