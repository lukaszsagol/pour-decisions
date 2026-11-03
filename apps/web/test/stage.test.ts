import { describe, expect, it } from 'vitest';
import { artFit } from '../src/stage.js';

describe('pixel-perfect stage scaling', () => {
  it('uses the largest whole number of device pixels per art pixel', () => {
    expect(artFit(390, 844, 3)).toMatchObject({ k: 6, scale: 1, left: 0, top: 0 });
    expect(artFit(390, 844, 2).k).toBe(4);
    expect(artFit(360, 780, 3).k).toBe(5);
    expect(artFit(1440, 900, 1).k).toBe(2);
  });

  it('never scales below one device pixel per art pixel', () => {
    expect(artFit(100, 200, 1).k).toBe(1);
  });

  it('centres on whole device pixels', () => {
    for (const [w, h, dpr] of [
      [360, 780, 3],
      [412, 915, 2.625],
      [375, 667, 2],
    ] as const) {
      const f = artFit(w, h, dpr);
      expect(Number.isInteger(195 * f.k)).toBe(true);
      expect(f.left * dpr).toBeCloseTo(Math.round(f.left * dpr), 6);
      expect(f.top * dpr).toBeCloseTo(Math.round(f.top * dpr), 6);
      expect(390 * f.scale).toBeLessThanOrEqual(w + 1e-9);
    }
  });
});
