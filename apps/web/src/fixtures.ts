import { parseBottles, type Bottle } from '@pour/engine';
import type { CityId } from '@pour/themes';

/**
 * Screen states copied from the design references, for side-by-side
 * screenshots. Not playable levels: they show a mid-level moment.
 */
export interface DesignFixture {
  city: CityId;
  number: number;
  barName: string;
  bottles: Bottle[];
  best: number;
  moves: number;
  selected: number | null;
  stock: { undo: number; extraGlass: number; hint: number };
}

export const designFixtures: Record<string, DesignFixture> = {
  'amsterdam-64': {
    city: 'amsterdam',
    number: 64,
    barName: 'Café de Gracht',
    bottles: parseBottles(
      [
        'jenever cherry advocaat curacao',
        'oranjebitter jenever curacao cherry',
        'advocaat oranjebitter cherry jenever',
        'curacao advocaat jenever oranjebitter',
        'cherry curacao oranjebitter advocaat',
        '',
        '',
      ],
      4,
      { 5: { lockedUntil: 'cherry' } },
    ),
    best: 21,
    moves: 8,
    selected: 1,
    stock: { undo: 4, extraGlass: 2, hint: 3 },
  },
  /** The designed golden level (also in `packages/engine/test/fixtures.ts`), playable from the start. */
  'tokyo-327': {
    city: 'tokyo',
    number: 327,
    barName: 'Golden alley',
    bottles: parseBottles(
      [
        'umeshu sakura melon ramune',
        'sakura ramune umeshu yuzu',
        '?melon ?yuzu sakura umeshu',
        'ramune melon yuzu yuzu',
        'umeshu sakura melon ramune',
        '',
        '',
      ],
      4,
      { 5: { only: 'yuzu' } },
    ),
    best: 16,
    moves: 0,
    selected: null,
    stock: { undo: 5, extraGlass: 2, hint: 3 },
  },
  /** No legal pour from the start: shows the dead-end panel. */
  'dead-end': {
    city: 'amsterdam',
    number: 2,
    barName: "Café 't Hoekje",
    bottles: parseBottles(['jenever advocaat', 'advocaat jenever'], 2),
    best: 3,
    moves: 0,
    selected: null,
    stock: { undo: 5, extraGlass: 2, hint: 3 },
  },
};
