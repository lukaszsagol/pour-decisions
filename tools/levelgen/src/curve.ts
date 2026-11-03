import { createRng, type Difficulty } from '@pour/engine';

/** What a level slot in a bar is for. Relief levels follow every Hard and Super Hard. */
export type SlotKind = 'normal' | 'relief' | 'hard' | 'superHard' | 'teach';

export const LEVELS_PER_BAR = 20;
export const BARS_PER_CITY = 5;

/**
 * Super Hard positions forced per bar to match the map designs (1-based).
 * TokyoMap: 328, AmsterdamMap: 65, LondonMap: 152, NewYorkMap: 248.
 * Hard levels are then placed around them, keeping the 5–10 spacing.
 */
export const SUPER_HARD_AT: Record<string, number> = {
  'tokyo-2': 8,
  'amsterdam-4': 5,
  'london-3': 12,
  'newyork-3': 8,
};

/**
 * The sawtooth for one bar (`docs/spec/progression.md`): mostly normal,
 * a Hard level every 5–10 levels, one Super Hard per bar, each followed by
 * an easier relief level. Deterministic per city and bar.
 */
export function barPlan(city: string, bar: number): SlotKind[] {
  const key = `${city}-${bar}`;
  const rng = createRng(`plan-${key}`);
  const plan: SlotKind[] = Array.from({ length: LEVELS_PER_BAR }, () => 'normal');
  // Super Hard late in the bar unless a design says otherwise.
  const superAt = SUPER_HARD_AT[key] ?? 12 + rng.int(6);
  const peaks = [superAt];
  for (let p = superAt - (5 + rng.int(4)); p >= 3; p -= 5 + rng.int(4)) peaks.unshift(p);
  for (let p = superAt + 5 + rng.int(4); p <= LEVELS_PER_BAR - 1; p += 5 + rng.int(4)) peaks.push(p);
  for (const p of peaks) {
    plan[p - 1] = p === superAt ? 'superHard' : 'hard';
    plan[p] = 'relief';
  }
  return plan;
}

/** Pack difficulty label for a slot. */
export function difficultyOf(kind: SlotKind): Difficulty {
  return kind === 'hard' ? 'hard' : kind === 'superHard' ? 'superHard' : 'normal';
}
