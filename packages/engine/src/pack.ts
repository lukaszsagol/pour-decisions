import { validateLevel } from './rules.js';
import type { Bottle } from './types.js';

/** Level difficulty band shown on the map. */
export type Difficulty = 'normal' | 'hard' | 'superHard';

export interface LevelMetrics {
  branching: number;
  deadEndShare: number;
  botWinRate: number;
  [key: string]: number;
}

/** One level as stored in `levels/<city>/<bar>.json` (see `docs/spec/levels.md`). */
export interface PackLevel {
  id: string;
  /** Global level number, 1–400. */
  number: number;
  difficulty: Difficulty;
  /** Fewest pours that solve the level, found by the solver. */
  best: number;
  seed: string;
  bottles: Bottle[];
  metrics: LevelMetrics;
}

export interface LevelPack {
  city: string;
  bar: number;
  name: string;
  levels: PackLevel[];
}

/** Structural checks for a pack: numbering, ids, difficulty and level validity. */
export function validatePack(pack: LevelPack): string[] {
  const errors: string[] = [];
  if (!pack.city) errors.push('Pack needs a city');
  if (!Number.isInteger(pack.bar) || pack.bar < 1) errors.push('Pack bar must be a positive integer');
  const seen = new Set<number>();
  for (const level of pack.levels) {
    if (seen.has(level.number)) errors.push(`Duplicate level ${level.number}`);
    seen.add(level.number);
    if (!['normal', 'hard', 'superHard'].includes(level.difficulty))
      errors.push(`Level ${level.number} has unknown difficulty ${level.difficulty}`);
    if (!Number.isInteger(level.best) || level.best < 1) errors.push(`Level ${level.number} needs a positive best`);
    for (const e of validateLevel(level.bottles)) errors.push(`Level ${level.number}: ${e}`);
  }
  return errors;
}
