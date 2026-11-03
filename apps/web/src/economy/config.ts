/**
 * Every reward and price in one place (`docs/spec/progression.md`).
 * Starting values to tune from play data.
 */
export const economy = {
  start: { undo: 5, extraGlass: 2, hint: 3, coins: 300 },
  win: {
    coins: 20,
    perStarAboveOne: 10,
    multiplier: { normal: 1, hard: 2, superHard: 3 },
  },
  /** Coins for one booster in the shop. */
  boosterPrice: 300,
  /** An extra glass at a dead end when the player has none. */
  deadEndContinue: 300,
  /** Win-streak rewards: consecutive first-try wins. */
  streak: [
    { at: 3, booster: 'undo' },
    { at: 5, booster: 'extraGlass' },
    { at: 10, booster: 'hint' },
  ],
  /** Lives are off unless the feature flag is on. */
  lives: { enabled: false, max: 5, refillMinutes: 30 },
} as const;

export type BoosterKind = 'undo' | 'extraGlass' | 'hint';
