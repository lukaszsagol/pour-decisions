import { cloneBottles, deal, solveAuto, type Bottle } from '@pour/engine';
import { drinksFor, type Theme } from '@pour/themes';

export type TrainingMode = 'planning' | 'planAhead' | 'memory';

export interface TrainingSession {
  mode: TrainingMode;
  /** Milliseconds since the epoch. */
  t: number;
  won: boolean;
  score: number;
  moves: number;
  best: number;
  /** Average thinking time per pour, in ms. */
  msPerPour: number;
  rating: number;
}

export const modes: Record<TrainingMode, { title: string; about: string; boosters: boolean; peekMs?: number }> = {
  planning: {
    title: 'Planning',
    about: 'A fresh level scored on how close you come to the fewest pours, and how long you think per pour.',
    boosters: true,
  },
  planAhead: {
    title: 'Plan ahead',
    about: 'No undo, no hints, no extra glass. Think the sequence through before you pour.',
    boosters: false,
  },
  memory: {
    title: 'Memory',
    about: 'See every glass for a few seconds, then everything below the top is covered.',
    boosters: true,
    peekMs: 6000,
  },
};

export const MIN_RATING = 1;
export const MAX_RATING = 6;

/** Drinks for a training level: grows with the rating. */
export function drinksForRating(rating: number): number {
  return Math.min(9, 3 + Math.max(MIN_RATING, Math.min(MAX_RATING, rating)));
}

/** How close a win came to the solver's best, 0–100. A loss scores 0. */
export function planningScore(won: boolean, moves: number, best: number): number {
  if (!won || moves <= 0) return 0;
  return Math.min(100, Math.round((100 * best) / moves));
}

/** Adaptive difficulty: up after a clean win, down after a loss or a wasteful win. */
export function nextRating(rating: number, won: boolean, score: number): number {
  const step = !won ? -1 : score >= 90 ? 1 : score < 65 ? -1 : 0;
  return Math.max(MIN_RATING, Math.min(MAX_RATING, rating + step));
}

export interface TrainingLevel {
  bottles: Bottle[];
  best: number;
  seed: string;
}

/** A training level generated on the device. Memory mode covers every unit below the top. */
export function trainingLevel(mode: TrainingMode, theme: Theme, rating: number, seed: string): TrainingLevel {
  const drinks = drinksFor(theme, drinksForRating(rating)).map((d) => d.id);
  for (let k = 0; ; k++) {
    const s = `${seed}-${k}`;
    const bottles = deal({ drinks, empties: 2, seed: s });
    const r = solveAuto(bottles, { bfsNodes: 40_000, fallbackNodes: 60_000 });
    if (!r.solvable) continue;
    const out = cloneBottles(bottles);
    if (mode === 'memory') for (const b of out) b.units.forEach((u, i) => (u.hidden = i < b.units.length - 1));
    return { bottles: out, best: r.moves!.length, seed: s };
  }
}

/** Last n scores of a mode, oldest first. */
export function recentScores(sessions: readonly TrainingSession[], mode: TrainingMode, n = 20): number[] {
  return sessions
    .filter((s) => s.mode === mode)
    .slice(-n)
    .map((s) => s.score);
}
