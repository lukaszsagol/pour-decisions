import { describe, expect, it } from 'vitest';
import { parentOf, type NavContext } from '../src/nav.js';

const ctx: NavContext = {
  mapOfLevel: (n) => `#/map/${n > 100 ? 'london' : 'amsterdam'}`,
  currentLevel: 140,
  completeNext: '#/map/london',
};

describe('back navigation', () => {
  it('goes up from a level to its city map, not to the previous screen', () => {
    expect(parentOf('#/level/7', ctx)).toBe('#/map/amsterdam');
    expect(parentOf('#/level/151', ctx)).toBe('#/map/london');
    expect(parentOf('#/level', ctx)).toBe('#/map/london');
  });

  it('goes from the tabs and maps to the passport, which is the root', () => {
    for (const hash of ['#/map/tokyo', '#/map', '#/daily', '#/book', '#/training', '#/family'])
      expect(parentOf(hash, ctx)).toBe('#/passport');
    expect(parentOf('#/passport', ctx)).toBeNull();
    expect(parentOf('', ctx)).toBeNull();
    expect(parentOf('#/', ctx)).toBeNull();
  });

  it('leaves played modes to the screen that started them', () => {
    expect(parentOf('#/daily/play', ctx)).toBe('#/daily');
    expect(parentOf('#/train/memory', ctx)).toBe('#/training');
    expect(parentOf('#/complete', ctx)).toBe('#/map/london');
    expect(parentOf('#/complete', { ...ctx, completeNext: null })).toBe('#/passport');
  });
});
