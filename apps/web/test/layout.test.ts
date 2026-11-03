import { describe, expect, it } from 'vitest';
import { getTheme, themes } from '@pour/themes';
import { glassGeometry, unitRects } from '../src/level/geometry.js';
import { GLASS_AREA, layoutGlasses, rowSizes } from '../src/level/layout.js';

describe('glass layout', () => {
  it('uses balanced rows of up to four', () => {
    expect(rowSizes(3)).toEqual([3]);
    expect(rowSizes(5)).toEqual([3, 2]);
    expect(rowSizes(7)).toEqual([4, 3]);
    expect(rowSizes(9)).toEqual([3, 3, 3]);
    expect(rowSizes(12)).toEqual([4, 4, 4]);
  });

  it('matches the design positions for seven glasses', () => {
    const slots = layoutGlasses(7);
    expect(slots[0]).toMatchObject({ x: 45, y: 216, scale: 1 });
    expect(slots[4]).toMatchObject({ x: 85, y: 434 });
  });

  it('scales down to fit three rows inside the area', () => {
    const slots = layoutGlasses(12);
    const s = slots[0]!.scale;
    expect(s).toBeLessThan(1);
    const last = slots[11]!;
    expect(last.y + 200 * s).toBeLessThanOrEqual(GLASS_AREA.y + GLASS_AREA.h + 0.001);
  });
});

describe('glass geometry', () => {
  it('fits every unit inside the body for every city', () => {
    for (const theme of themes) {
      const g = glassGeometry(theme);
      for (const cap of [3, 4, 5]) {
        const rects = unitRects(g, cap);
        expect(rects).toHaveLength(cap);
        expect(rects[cap - 1]!.y).toBeGreaterThanOrEqual(g.border + g.padding - 0.001);
        expect(rects[0]!.y + rects[0]!.h).toBeLessThanOrEqual(g.bodyH - g.border - g.padding);
      }
    }
  });

  it('runs the liquid wall to wall with no gaps, leaving air under the rim', () => {
    const g = glassGeometry(getTheme('amsterdam'));
    const r = unitRects(g, 4);
    expect(r[0]).toMatchObject({ x: g.border, w: g.bodyW - 2 * g.border });
    expect(r[0]!.y + r[0]!.h).toBe(g.bodyH - g.border);
    for (let i = 1; i < 4; i++) expect(r[i]!.y + r[i]!.h).toBeCloseTo(r[i - 1]!.y);
    expect(r[3]!.y).toBeGreaterThan(g.border + 10);
  });
});
