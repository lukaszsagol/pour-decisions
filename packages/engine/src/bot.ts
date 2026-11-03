import { cloneBottles, isComplete, isWon, legalMoves, pour, settle, stateKey, topRun } from './rules.js';
import { createRng, type Rng } from './random.js';
import { analyse, type Analysis } from './search.js';
import type { Bottle, Move } from './types.js';

export interface BotOptions {
  /** Chance per pour of playing a random legal pour instead of a sensible one. Default 0.15. */
  mistakeRate?: number;
  /** Give up after this many pours. Default 200. */
  maxMoves?: number;
}

export interface BotGame {
  won: boolean;
  moves: number;
}

/** How much a casual player likes a pour. Higher is better. */
function appeal(bottles: readonly Bottle[], m: Move, last: Move | null): number {
  const a = bottles[m.from]!;
  const b = bottles[m.to]!;
  const run = topRun(a);
  let score = 0;
  if (b.units.length > 0) score += 3; // stacking onto the same drink
  if (b.units.length + run >= b.capacity && b.units.length > 0) score += 1;
  if (run === a.units.length && b.units.length === 0) score -= 4; // moving a clean glass into an empty one
  if (b.units.length === 0 && run < a.units.length) score += 0.5; // digging something out
  if (last && last.from === m.to && last.to === m.from) score -= 6; // pouring straight back
  const after = pour(bottles, m).bottles;
  if (isComplete(after[m.to]!)) score += 4;
  return score;
}

/**
 * Plays one game like a casual human: mostly picks the most appealing pour,
 * sometimes a random one, never uses boosters, gives up when it loops.
 */
export function playBot(start: readonly Bottle[], rng: Rng, options: BotOptions = {}): BotGame {
  const mistake = options.mistakeRate ?? 0.15;
  const maxMoves = options.maxMoves ?? 200;
  let bottles = cloneBottles(start);
  settle(bottles);
  const seen = new Map<string, number>();
  let last: Move | null = null;
  for (let moves = 0; moves < maxMoves; moves++) {
    if (isWon(bottles)) return { won: true, moves };
    const options = legalMoves(bottles);
    if (options.length === 0) return { won: false, moves };
    let move: Move;
    if (rng.next() < mistake) move = rng.pick(options);
    else {
      const scored = options.map((m) => ({ m, s: appeal(bottles, m, last) + rng.next() * 0.5 }));
      scored.sort((x, y) => y.s - x.s);
      move = scored[0]!.m;
    }
    bottles = pour(bottles, move).bottles;
    last = move;
    const key = stateKey(bottles);
    const visits = (seen.get(key) ?? 0) + 1;
    if (visits > 3) return { won: false, moves: moves + 1 };
    seen.set(key, visits);
  }
  return { won: isWon(bottles), moves: maxMoves };
}

/** Share of bot games won, from `runs` games seeded from `seed`. */
export function botWinRate(
  start: readonly Bottle[],
  runs = 200,
  seed: string | number = 'bot',
  options?: BotOptions,
): number {
  const rng = createRng(seed);
  let wins = 0;
  for (let i = 0; i < runs; i++) if (playBot(start, rng, options).won) wins++;
  return wins / runs;
}

export type DifficultyBand = 'easy' | 'normal' | 'hard' | 'superHard';

export interface DifficultyScore {
  /** 0 (trivial) to 100 (brutal). */
  score: number;
  band: DifficultyBand;
  botWinRate: number;
  analysis: Analysis;
}

export interface DifficultyOptions {
  runs?: number;
  seed?: string | number;
  bot?: BotOptions;
  /** Reuse an analysis already computed for this level. */
  analysis?: Analysis;
}

/** Band edges on the 0–100 score. */
export const BANDS: readonly [DifficultyBand, number][] = [
  ['easy', 30],
  ['normal', 55],
  ['hard', 75],
  ['superHard', Infinity],
];

/**
 * Difficulty from bot play (how often a casual player gets stuck) and solver
 * metrics (how long the solution is, how many first moves already lose).
 */
export function difficulty(start: readonly Bottle[], options: DifficultyOptions = {}): DifficultyScore {
  const analysis = options.analysis ?? analyse(start);
  const win = botWinRate(start, options.runs ?? 200, options.seed ?? 'difficulty', options.bot);
  const length = Math.min(1, analysis.best / 40);
  // Pours into an empty glass are where planning matters: spare space is scarce.
  const pressure = analysis.solvable ? Math.min(1, analysis.emptyPours / 8) : 1;
  const raw = 0.5 * (1 - win) + 0.2 * length + 0.15 * analysis.deadEndShare + 0.15 * pressure;
  const score = Math.round(Math.max(0, Math.min(1, raw)) * 100);
  const band = BANDS.find(([, edge]) => score < edge)![0];
  return { score, band, botWinRate: win, analysis };
}
