import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseBottles } from '@pour/engine';
import { getTheme } from '@pour/themes';
import { amsterdamBackdrop, RESTART } from '../src/pixel/level/amsterdam.js';
import { amsterdamArt } from '../src/pixel/level/art.js';
import { PixelLevelRenderer } from '../src/pixel/level/renderer.js';
import { readPng } from './png.js';

const REF = path.resolve(import.meta.dirname, '../../../docs/design/pixel/amsterdam-level-1x.png');

/** The state drawn in docs/design/pixel: level 64, glass 2 selected, glass 6 chained until cherry brandy. */
function referenceScene(withRestart: boolean) {
  const bottles = parseBottles(
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
  );
  const r = new PixelLevelRenderer(getTheme('amsterdam'), {
    ...amsterdamArt,
    backdrop: () => amsterdamBackdrop(0, withRestart),
  });
  r.setCount(7);
  return r.render({
    glasses: bottles.map((bottle, i) => ({
      bottle,
      mark: i === 1 ? 'selected' : 'none',
      lift: i === 1 ? 7 : 0,
      dx: 0,
    })),
    counts: [4, 2, 3],
    usable: [true, true, true],
    boosters: true,
    phase: 0,
  });
}

function differences(withRestart: boolean): { x: number; y: number }[] {
  const ref = readPng(REF);
  const cv = referenceScene(withRestart);
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < ref.h; y++) for (let x = 0; x < ref.w; x++) if (cv.get(x, y) !== ref.at(x, y)) out.push({ x, y });
  return out;
}

describe('Amsterdam level against the pixel reference', () => {
  it('is 195×422 art pixels', () => {
    const ref = readPng(REF);
    expect([ref.w, ref.h]).toEqual([195, 422]);
  });

  it('draws the reference scene pixel for pixel', () => {
    expect(differences(false)).toEqual([]);
  });

  it('differs from the reference only where the restart button was added', () => {
    const outside = differences(true).filter(
      ({ x, y }) => x < RESTART.x || x > RESTART.x + 12 || y < RESTART.y || y > RESTART.y + 12,
    );
    expect(outside).toEqual([]);
  });
});
