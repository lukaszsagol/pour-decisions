import { cloneBottles } from './rules.js';
import { solveAuto, solveBestFirst, type AutoSolveOptions } from './search.js';
import type { Bottle, DrinkId } from './types.js';

/** Every distinct ordering of a multiset (for small lists only). */
function permutations(items: DrinkId[]): DrinkId[][] {
  if (items.length <= 1) return [items];
  const out: DrinkId[][] = [];
  const seen = new Set<DrinkId>();
  items.forEach((x, i) => {
    if (seen.has(x)) return;
    seen.add(x);
    for (const rest of permutations([...items.slice(0, i), ...items.slice(i + 1)])) out.push([x, ...rest]);
  });
  return out;
}

/**
 * True when the level can be won whatever the hidden units turn out to be:
 * every arrangement of the hidden drinks over the hidden slots is solvable.
 * So information never decides the outcome (`docs/spec/levels.md`, step 5).
 * Meant for a handful of hidden units; throws above `maxHidden`.
 */
export function solvableForEveryReveal(
  start: readonly Bottle[],
  options: AutoSolveOptions & { maxHidden?: number } = {},
): boolean {
  const slots: [number, number][] = [];
  start.forEach((b, i) => b.units.forEach((u, j) => u.hidden && slots.push([i, j])));
  if (slots.length > (options.maxHidden ?? 6))
    throw new Error(`Too many hidden units (${slots.length}) to check every reveal`);
  const drinks = slots.map(([i, j]) => start[i]!.units[j]!.drink);
  for (const order of permutations(drinks)) {
    const bottles = cloneBottles(start);
    slots.forEach(([i, j], k) => (bottles[i]!.units[j]!.drink = order[k]!));
    if (solveBestFirst(bottles, { maxNodes: 20_000 }).solvable) continue;
    if (!solveAuto(bottles, options).solvable) return false;
  }
  return true;
}
