/**
 * Every reward in one place (`docs/spec/progression.md`). There is no
 * currency: boosters are limited and earned by playing well.
 */
export const economy = {
  start: { undo: 5, extraGlass: 2, hint: 3 },
  /** Win-streak rewards: consecutive first-try wins. */
  streak: [
    { at: 3, booster: 'undo' },
    { at: 5, booster: 'extraGlass' },
    { at: 10, booster: 'hint' },
  ],
  /** Finishing a bar for the first time: one of each. */
  barFinished: ['undo', 'extraGlass', 'hint'],
  /** The first finish of the daily pour. */
  daily: ['hint'],
  /** Lives are off unless the feature flag is on. */
  lives: { enabled: false, max: 5, refillMinutes: 30 },
} as const;

export type BoosterKind = 'undo' | 'extraGlass' | 'hint';
