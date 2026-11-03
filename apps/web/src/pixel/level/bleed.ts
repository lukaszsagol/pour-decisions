import type { PixelCanvas } from '../canvas.js';

/**
 * Materials for the margins around the 195×422 stage. Each city's `bleed()`
 * draws its walls and counter wider than the stage; these fill what lies
 * beyond the stage's top edge.
 */

/** A ceiling of horizontal planks above `top`, each 7 rows: highlight, body, dark seam. */
export function ceiling(cv: PixelCanvas, t: { base: string; light: string; seam: string }, top = 0): void {
  if (cv.minY >= top) return;
  cv.rect(cv.minX, cv.minY, cv.w, top - cv.minY, t.base);
  for (let y = top - 1; y >= cv.minY; y -= 7) {
    cv.hline(cv.minX, y, cv.w, t.seam);
    cv.hline(cv.minX, y - 6, cv.w, t.light);
  }
}
