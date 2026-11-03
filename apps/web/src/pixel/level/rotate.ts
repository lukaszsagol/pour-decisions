import { PixelCanvas } from '../canvas.js';

/**
 * Rotates a sprite by `deg` (clockwise) around (px, py) with nearest-neighbour
 * sampling, so the result stays on the pixel grid. Returns the rotated
 * sprite and where the pivot lands inside it.
 */
export function rotateNearest(
  src: PixelCanvas,
  deg: number,
  px: number,
  py: number,
): { cv: PixelCanvas; px: number; py: number } {
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const r = Math.ceil(Math.hypot(Math.max(px, src.w - px), Math.max(py, src.h - py))) + 1;
  const size = r * 2 + 1;
  const out = new PixelCanvas(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - r;
      const dy = y - r;
      // Inverse rotation back into the source.
      const sx = Math.round(px + dx * cos + dy * sin);
      const sy = Math.round(py - dx * sin + dy * cos);
      if (sx < 0 || sy < 0 || sx >= src.w || sy >= src.h) continue;
      const p = src.data[sy * src.w + sx]!;
      if (p) out.data[y * size + x] = p;
    }
  }
  return { cv: out, px: r, py: r };
}
