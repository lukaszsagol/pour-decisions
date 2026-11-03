import type { CityId } from '@pour/themes';

export type BlockerKind = 'locked' | 'hidden' | 'only';

export interface CityRules {
  /** Blockers used in this city, in the order they were introduced. */
  blockers: BlockerKind[];
  /** The blocker this city introduces, and the level that teaches it. */
  introduces?: { blocker: BlockerKind; level: number };
}

/**
 * Each city introduces one blocker and keeps the earlier ones
 * (`docs/spec/progression.md`). Amsterdam teaches the locked glass in bar 2,
 * so bar 1 has no blockers. Tokyo's frozen layer is not in the engine yet.
 */
export const cityRules: Record<CityId, CityRules> = {
  amsterdam: { blockers: ['locked'], introduces: { blocker: 'locked', level: 21 } },
  london: { blockers: ['locked', 'hidden'], introduces: { blocker: 'hidden', level: 101 } },
  newyork: { blockers: ['locked', 'hidden', 'only'], introduces: { blocker: 'only', level: 201 } },
  tokyo: { blockers: ['locked', 'hidden', 'only'] },
};
