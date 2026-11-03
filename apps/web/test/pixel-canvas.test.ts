import { describe, expect, it } from 'vitest';
import { bigDigits, digits, dith, mix, PixelCanvas, pyRound } from '../src/pixel/canvas.js';

describe('pixel colour helpers (match the Python reference)', () => {
  it('mixes colours exactly like the reference mix()', () => {
    // Expected values computed with the reference Python.
    expect(mix('#2C1B11', '#5A3A24', 0.35)).toBe('#3C2618');
    expect(mix('#291910', '#120A05', 0.45)).toBe('#1F120B');
    expect(mix('#F0CF3E', '#FFE98A', 0.65)).toBe('#FAE06F');
    expect(mix('#A8213A', '#000000', 0.5)).toBe('#54101D');
    expect(mix('#8C5A22', '#5E3C0E', 0.5)).toBe('#754B18');
    expect(mix('#FFFFFF', '#000000', 0.5)).toBe('#808080');
  });

  it("rounds halves to even, like Python's round()", () => {
    expect(pyRound(2.5)).toBe(2);
    expect(pyRound(3.5)).toBe(4);
    expect(pyRound(127.5)).toBe(128);
    expect(pyRound(2.4)).toBe(2);
  });

  it('dithers with the 4×4 Bayer matrix', () => {
    const pattern = (t: number) =>
      Array.from({ length: 16 }, (_, i) => (dith(i % 4, Math.floor(i / 4), t) ? '1' : '0')).join('');
    expect(pattern(0.5)).toBe('1010010110100101');
    expect(pattern(0.35)).toBe('1010010010100001');
    expect(pattern(0)).toBe('0'.repeat(16));
    expect(dith(-1, -1, 0.5)).toBe(dith(3, 3, 0.5));
  });
});

describe('pixel canvas', () => {
  it('draws pixels, rects, lines and sprites, clipped to the buffer', () => {
    const cv = new PixelCanvas(8, 6, '#000000');
    cv.px(0, 0, '#FF0000');
    cv.px(99, 99, '#FF0000');
    cv.rect(6, 4, 5, 5, '#00FF00');
    cv.hline(1, 1, 3, '#0000FF');
    cv.vline(5, 0, 2, '#FFFFFF');
    cv.sprite(1, 3, ['#.', '.#'], { '#': '#123456' });
    expect(cv.get(0, 0)).toBe('#FF0000');
    expect(cv.get(7, 5)).toBe('#00FF00');
    expect(cv.get(3, 1)).toBe('#0000FF');
    expect(cv.get(4, 1)).toBe('#000000');
    expect(cv.get(5, 1)).toBe('#FFFFFF');
    expect([cv.get(1, 3), cv.get(2, 3), cv.get(2, 4)]).toEqual(['#123456', '#000000', '#123456']);
    expect(cv.get(8, 0)).toBeNull();
  });

  it('draws Bresenham lines, optionally dashed', () => {
    const cv = new PixelCanvas(6, 6);
    cv.line(0, 0, 5, 5, '#FFFFFF');
    for (let i = 0; i < 6; i++) expect(cv.get(i, i)).toBe('#FFFFFF');
    const d = new PixelCanvas(8, 1);
    d.line(0, 0, 7, 0, '#FFFFFF', [2, 1]);
    expect(Array.from({ length: 8 }, (_, x) => (d.get(x, 0) ? '#' : '.')).join('')).toBe('##.##.##');
  });

  it('tints and dithers shadows only over existing pixels', () => {
    const cv = new PixelCanvas(4, 4);
    cv.rect(0, 0, 4, 2, '#FFFFFF');
    cv.shadowBox(0, 0, 4, 4, 0.5, 0.5);
    expect(cv.get(0, 0)).toBe('#808080');
    expect(cv.get(1, 0)).toBe('#FFFFFF');
    expect(cv.get(0, 2)).toBeNull();
  });

  it('blits buffers, skipping transparent pixels, and exports RGBA', () => {
    const a = new PixelCanvas(3, 1, '#000000');
    const b = new PixelCanvas(2, 1);
    b.px(1, 0, '#FF8000');
    a.blit(b, 1, 0);
    expect([a.get(1, 0), a.get(2, 0)]).toEqual(['#000000', '#FF8000']);
    expect(Array.from(a.toRGBA().slice(8, 12))).toEqual([255, 128, 0, 255]);
  });

  it('draws digit sprites', () => {
    const cv = new PixelCanvas(12, 7);
    digits(cv, 0, 0, '10', '#FFFFFF');
    expect(cv.get(1, 0)).toBe('#FFFFFF');
    expect(cv.get(4, 0)).toBe('#FFFFFF');
    const big = new PixelCanvas(10, 7);
    bigDigits(big, 0, 0, '4', '#FFFFFF');
    expect(big.get(3, 3)).toBe('#FFFFFF');
  });
});
