import { isComplete } from './rules.js';
import { createRng } from './random.js';
import type { Bottle, DrinkId } from './types.js';

export interface DealConstraints {
  /** Longest run of the same drink allowed in a bottle at the start. Default 2. */
  maxRun?: number;
  /** Minimum number of colour changes across all bottles (fragmentation). Default 0. */
  minBreaks?: number;
}

export interface DealOptions {
  drinks: readonly DrinkId[];
  capacity?: number;
  empties?: number;
  seed: string | number;
  constraints?: DealConstraints;
  /** Give up after this many shuffles. Default 10 000. */
  maxTries?: number;
}

/** Longest same-drink run inside one bottle. */
export function longestRun(bottle: Bottle): number {
  let best = 0;
  let run = 0;
  for (let i = 0; i < bottle.units.length; i++) {
    run = i > 0 && bottle.units[i]!.drink === bottle.units[i - 1]!.drink ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

/** Number of adjacent unit pairs with different drinks, over all bottles. */
export function colourBreaks(bottles: readonly Bottle[]): number {
  let n = 0;
  for (const b of bottles)
    for (let i = 1; i < b.units.length; i++) if (b.units[i]!.drink !== b.units[i - 1]!.drink) n++;
  return n;
}

/**
 * Shuffles `capacity` units of each drink into full bottles plus `empties`
 * empty ones (step 1 of the level pipeline in `docs/spec/levels.md`). No
 * bottle starts complete and same-drink runs are capped. Deterministic for a
 * given seed: it reshuffles from the same generator until the constraints hold.
 */
export function deal(options: DealOptions): Bottle[] {
  const { drinks, seed } = options;
  const capacity = options.capacity ?? 4;
  const empties = options.empties ?? 2;
  const maxRun = options.constraints?.maxRun ?? 2;
  const minBreaks = options.constraints?.minBreaks ?? 0;
  if (drinks.length < 2) throw new Error('A level needs at least two drinks');
  if (maxRun >= capacity) throw new Error('maxRun must be below capacity, or bottles could start complete');
  const rng = createRng(seed);
  const units = drinks.flatMap((d) => Array.from({ length: capacity }, () => d));
  const tries = options.maxTries ?? 10_000;
  for (let t = 0; t < tries; t++) {
    const shuffled = rng.shuffle(units);
    const bottles: Bottle[] = drinks.map((_, i) => ({
      capacity,
      units: shuffled.slice(i * capacity, (i + 1) * capacity).map((drink) => ({ drink, hidden: false })),
    }));
    if (bottles.some(isComplete)) continue;
    if (bottles.some((b) => longestRun(b) > maxRun)) continue;
    if (colourBreaks(bottles) < minBreaks) continue;
    for (let e = 0; e < empties; e++) bottles.push({ capacity, units: [] });
    return bottles;
  }
  throw new Error(`No deal met the constraints after ${tries} tries (seed ${seed})`);
}
