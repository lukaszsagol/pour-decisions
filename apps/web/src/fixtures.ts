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
};
