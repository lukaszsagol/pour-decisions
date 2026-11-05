import { describe, expect, it } from 'vitest';
import { pourSign, pourSignLabel, starLossMessage, urgency } from '../src/level/pour-sign.js';

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

  it('shows the result once won: winning on par keeps three stars', () => {
    expect(pourSign(21, 21, false, true)).toEqual({ count: 0, stars: 3, total: false });
    expect(pourSign(25, 21, false, true)).toEqual({ count: 0, stars: 2, total: false });
    expect(pourSign(21, 21, true, true)).toEqual({ count: 0, stars: 2, total: false });
    expect(pourSign(30, 21, false, true)).toEqual({ count: 30, stars: 1, total: true });
  });

  it('reads out the pours, par and what is left', () => {
    expect(pourSignLabel(1, 9, pourSign(1, 9, false))).toBe('1 pour, par 9: 8 left for three stars');
    expect(pourSignLabel(14, 9, pourSign(14, 9, false))).toBe('14 pours, par 9: one star');
  });
});

describe('pour sign urgency and star loss', () => {
  it('gets louder over the last three pours of a countdown, not when counting up', () => {
    expect(urgency(pourSign(17, 21, false))).toBe(0);
    expect(urgency(pourSign(18, 21, false))).toBe(3);
    expect(urgency(pourSign(20, 21, false))).toBe(1);
    expect(urgency(pourSign(40, 21, false))).toBe(0);
  });

  it('says which star went and what is left', () => {
    expect(starLossMessage(pourSign(20, 21, false), pourSign(21, 21, false), false)).toBe(
      'Three stars gone: 7 pours left for two',
    );
    expect(starLossMessage(pourSign(27, 21, false), pourSign(28, 21, false), false)).toBe(
      'Two stars gone: finish for one star',
    );
    expect(starLossMessage(pourSign(3, 21, false), pourSign(3, 21, true), true)).toBe(
      'Extra glass: two stars at most now. 25 pours left for two',
    );
  });
});
