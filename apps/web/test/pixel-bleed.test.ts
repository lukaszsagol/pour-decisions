import { getTheme, type CityId } from '@pour/themes';
import { describe, expect, it } from 'vitest';
import { PixelCanvas } from '../src/pixel/canvas.js';
import { cityArt } from '../src/pixel/level/art.js';
import { cityBand } from '../src/pixel/scenes.js';

describe('a canvas with its origin moved', () => {
  it('draws at negative coordinates into the margin', () => {
    const cv = new PixelCanvas(10, 10, null, 3, 2);
    expect([cv.minX, cv.maxX, cv.minY, cv.maxY]).toEqual([-3, 7, -2, 8]);
    cv.px(-3, -2, '#FF0000');
    cv.rect(-1, 0, 2, 1, '#00FF00');
    expect(cv.get(-3, -2)).toBe('#FF0000');
    expect(cv.data[0]).not.toBe(0);
    expect(cv.get(-1, 0)).toBe('#00FF00');
    expect(cv.get(0, 0)).toBe('#00FF00');
    expect(cv.get(-4, 0)).toBeNull();
  });

  it('blits a stage-sized canvas at the origin', () => {
    const cv = new PixelCanvas(6, 6, null, 2, 2);
    cv.blit(new PixelCanvas(2, 2, '#0000FF'), 0, 0);
    expect(cv.get(0, 0)).toBe('#0000FF');
    expect(cv.get(1, 1)).toBe('#0000FF');
    expect(cv.get(-1, -1)).toBeNull();
  });
});

describe('level art beyond the stage', () => {
  for (const city of ['amsterdam', 'london', 'newyork', 'tokyo'] as CityId[]) {
    it(`${city}: fills every margin pixel and leaves the stage as drawn`, () => {
      const art = cityArt(getTheme(city));
      const cv = new PixelCanvas(195 + 140, 422 + 120, null, 70, 60);
      art.bleed(cv, 0);
      expect(cv.data.every((p) => p !== 0)).toBe(true);
      const band = cityBand(getTheme(city), { l: 20, r: 20, t: 30 });
      expect(band.data.every((p) => p !== 0)).toBe(true);
      const core = art.backdrop(0);
      cv.blit(core, 0, 0);
      for (let y = 0; y < 422; y += 7) for (let x = 0; x < 195; x += 5) expect(cv.get(x, y)).toBe(core.get(x, y));
    });
  }
});
