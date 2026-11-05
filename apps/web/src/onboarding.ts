import type { Progress } from './economy/save.js';

/**
 * First night out: a new player gets a welcome, a passport that shows only what a beginner can
 * use, and features that open one at a time, each announced once by the bartender
 * (owner, 2026-11-05).
 */
export type Feature = 'daily' | 'book' | 'training';

export const FEATURES: readonly Feature[] = ['daily', 'book', 'training'];

/** The level whose win opens each feature: Tonight's pour after level 5; the rest after the first bar. */
export const OPENS_AFTER: Record<Feature, number> = { daily: 5, book: 20, training: 20 };

/** "Opens after …" wording for each feature. */
export const OPENS_WHEN: Record<Feature, string> = {
  daily: 'after level 5',
  book: 'after the first bar',
  training: 'after the first bar',
};

export function isOpen(p: Progress, f: Feature): boolean {
  return p.data.current > OPENS_AFTER[f];
}

/** Until the first bar is finished, the passport stays simple. */
export function isBeginner(p: Progress): boolean {
  return p.data.current <= OPENS_AFTER.book;
}

/** The welcome shows on the first launch, until its button is pressed. */
export function needsWelcome(p: Progress): boolean {
  return !p.data.intro.welcomed && Object.keys(p.data.levels).length === 0;
}

/** Features open to the player that the bartender hasn't announced yet, in order. */
export function toAnnounce(p: Progress): Feature[] {
  return FEATURES.filter((f) => isOpen(p, f) && !p.data.intro.announced.includes(f));
}

/** Open, but never visited: its tab shows NEW. */
export function isNew(p: Progress, f: Feature): boolean {
  return isOpen(p, f) && !p.data.intro.opened.includes(f);
}
