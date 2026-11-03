import { parseBottles } from '../src/index.js';

/**
 * Golden levels: hand-checked positions with known answers. The solver,
 * generator and any future engine change must keep these passing.
 */

/** The playable Tokyo level 327 from the design canvas. */
export const tokyo327 = () =>
  parseBottles(
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
  );

/** Two drinks, one spare bottle: solvable in a few pours. */
export const tiny = () => parseBottles(['red blue', 'blue red', ''], 2);

/** No spare bottle and interleaved drinks: no legal pour at all. */
export const stuck = () => parseBottles(['red blue', 'blue red'], 2);

/** Already sorted. */
export const solved = () => parseBottles(['red red red red', 'blue blue blue blue', ''], 4);

/** A bottle chained shut until cherry is complete (Amsterdam blocker). */
export const chained = () =>
  parseBottles(['cherry cherry gin cherry', 'gin gin cherry gin', '', ''], 4, { 3: { lockedUntil: 'cherry' } });

/** Ten drinks in twelve bottles (dealt once with seed "big-1", stored literally). Best: 31. */
export const tenDrinks = () =>
  parseBottles([
    'c c a b',
    'h g a d',
    'c j j a',
    'b f j b',
    'd g h g',
    'd e i i',
    'h e d f',
    'g f i b',
    'j e a h',
    'e i c f',
    '',
    '',
  ]);
