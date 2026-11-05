import { describe, expect, it } from 'vitest';
import { pourSign, pourSignLabel } from '../src/level/pour-sign.js';

describe('pour sign', () => {
  it('counts down to par for three stars', () => {
    expect(pourSign(0, 21, false)).toEqual({ count: 21, stars: 3, total: false });
    expect(pourSign(20, 21, false)).toEqual({ count: 1, stars: 3, total: false });
  });

  it('then counts down to the end of two stars', () => {
    // Par 21: two stars up to 28 pours.
    expect(pourSign(21, 21, false)).toEqual({ count: 7, stars: 2, total: false });
    expect(pourSign(27, 21, false)).toEqual({ count: 1, stars: 2, total: false });
  });

  it('shows the pours so far once only one star is left', () => {
    expect(pourSign(28, 21, false)).toEqual({ count: 28, stars: 1, total: true });
    expect(pourSign(40, 21, false)).toEqual({ count: 40, stars: 1, total: true });
  });

  it('counts down for two stars after the extra glass, which caps the level at two', () => {
    expect(pourSign(3, 21, true)).toEqual({ count: 25, stars: 2, total: false });
  });

  it('reads out the pours, par and what is left', () => {
    expect(pourSignLabel(1, 9, pourSign(1, 9, false))).toBe('1 pour, par 9: 8 left for three stars');
    expect(pourSignLabel(14, 9, pourSign(14, 9, false))).toBe('14 pours, par 9: one star');
  });
});
