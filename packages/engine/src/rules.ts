import type { Bottle, DrinkId, Move, PourResult, Unit } from './types.js';

/** Deep copy of a bottle list. Bottles are small, so structured copying is cheap. */
export function cloneBottles(bottles: readonly Bottle[]): Bottle[] {
  return bottles.map((b) => ({
    ...b,
    units: b.units.map((u) => ({ ...u })),
  }));
}

export function top(bottle: Bottle): Unit | undefined {
  return bottle.units[bottle.units.length - 1];
}

/** Length of the contiguous run of the same visible drink at the top. */
export function topRun(bottle: Bottle): number {
  const t = top(bottle);
  if (!t || t.hidden) return 0;
  let n = 0;
  for (let i = bottle.units.length - 1; i >= 0; i--) {
    const u = bottle.units[i]!;
    if (u.hidden || u.drink !== t.drink) break;
    n++;
  }
  return n;
}

export function isLocked(bottle: Bottle): boolean {
  return bottle.lockedUntil !== undefined;
}

/** Full, one drink, nothing hidden. */
export function isComplete(bottle: Bottle): boolean {
  if (bottle.units.length !== bottle.capacity || bottle.capacity === 0) return false;
  const d = bottle.units[0]!.drink;
  return bottle.units.every((u) => !u.hidden && u.drink === d);
}

/** Every bottle is empty or complete, and nothing is still locked. */
export function isWon(bottles: readonly Bottle[]): boolean {
  return bottles.every((b) => !isLocked(b) && (b.units.length === 0 || isComplete(b)));
}

export function canPour(bottles: readonly Bottle[], move: Move): boolean {
  const { from, to } = move;
  if (from === to) return false;
  const a = bottles[from];
  const b = bottles[to];
  if (!a || !b) return false;
  if (isLocked(a) || isLocked(b)) return false;
  const t = top(a);
  if (!t || t.hidden) return false;
  if (b.units.length >= b.capacity) return false;
  if (b.only !== undefined && b.only !== t.drink) return false;
  const bt = top(b);
  if (bt && (bt.hidden || bt.drink !== t.drink)) return false;
  return true;
}

/**
 * Applies a pour and returns new bottles. Moves the whole top run, or as much
 * as fits. Afterwards reveals new top units and unlocks bottles whose drink
 * has been completed. Throws on an illegal move.
 */
export function pour(bottles: readonly Bottle[], move: Move): PourResult {
  if (!canPour(bottles, move)) {
    throw new Error(`Illegal pour ${move.from} -> ${move.to}`);
  }
  const next = cloneBottles(bottles);
  const a = next[move.from]!;
  const b = next[move.to]!;
  const amount = Math.min(topRun(a), b.capacity - b.units.length);
  for (let i = 0; i < amount; i++) {
    b.units.push(a.units.pop()!);
  }
  settle(next);
  return { bottles: next, amount };
}

/** Reveals top units and releases locks whose drink is complete. Mutates. */
export function settle(bottles: Bottle[]): void {
  for (const b of bottles) {
    const t = top(b);
    if (t) t.hidden = false;
  }
  const completed = new Set<DrinkId>();
  for (const b of bottles) {
    if (isComplete(b)) completed.add(b.units[0]!.drink);
  }
  for (const b of bottles) {
    if (b.lockedUntil !== undefined && completed.has(b.lockedUntil)) {
      delete b.lockedUntil;
    }
  }
}

/** All legal pours, excluding pointless ones out of complete bottles. */
export function legalMoves(bottles: readonly Bottle[]): Move[] {
  const moves: Move[] = [];
  for (let from = 0; from < bottles.length; from++) {
    if (isComplete(bottles[from]!)) continue;
    for (let to = 0; to < bottles.length; to++) {
      if (canPour(bottles, { from, to })) moves.push({ from, to });
    }
  }
  return moves;
}

/** True when no useful pour is left and the level is not won. */
export function isDeadEnd(bottles: readonly Bottle[]): boolean {
  return !isWon(bottles) && legalMoves(bottles).length === 0;
}

/**
 * Canonical key for a position. Bottle order does not matter, so bottles are
 * encoded and sorted. Hidden units are encoded with their true drink because
 * the solver plays with full information.
 */
export function stateKey(bottles: readonly Bottle[]): string {
  return bottles
    .map((b) => {
      const head = `${b.capacity}${b.only ? `o:${b.only}` : ''}${b.lockedUntil ? `l:${b.lockedUntil}` : ''}`;
      const body = b.units.map((u) => (u.hidden ? `?${u.drink}` : u.drink)).join(',');
      return `${head}[${body}]`;
    })
    .sort()
    .join('|');
}

/** Counts units per drink. Useful for validating levels. */
export function drinkCounts(bottles: readonly Bottle[]): Map<DrinkId, number> {
  const counts = new Map<DrinkId, number>();
  for (const b of bottles) {
    for (const u of b.units) counts.set(u.drink, (counts.get(u.drink) ?? 0) + 1);
  }
  return counts;
}

/**
 * Structural validation: every drink fills exactly one bottle's capacity
 * (all bottles share one capacity), units never exceed capacity, and lock and
 * only rules refer to drinks that exist.
 */
export function validateLevel(bottles: readonly Bottle[]): string[] {
  const errors: string[] = [];
  const caps = new Set(bottles.map((b) => b.capacity));
  if (caps.size !== 1) errors.push('All bottles must share one capacity');
  const cap = bottles[0]?.capacity ?? 0;
  bottles.forEach((b, i) => {
    if (b.units.length > b.capacity) errors.push(`Bottle ${i} is over capacity`);
  });
  const counts = drinkCounts(bottles);
  for (const [drink, n] of counts) {
    if (n !== cap) errors.push(`Drink ${drink} has ${n} units, expected ${cap}`);
  }
  for (const [i, b] of bottles.entries()) {
    if (b.only && !counts.has(b.only)) errors.push(`Bottle ${i} only accepts missing drink ${b.only}`);
    if (b.lockedUntil && !counts.has(b.lockedUntil)) errors.push(`Bottle ${i} waits for missing drink ${b.lockedUntil}`);
  }
  return errors;
}
