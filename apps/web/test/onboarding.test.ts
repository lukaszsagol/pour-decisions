import { describe, expect, it } from 'vitest';
import { migrate, Progress, SAVE_KEY, type KeyValueStore } from '../src/economy/save.js';
import { isBeginner, isNew, isOpen, needsWelcome, toAnnounce } from '../src/onboarding.js';

const store = (save?: unknown): KeyValueStore => {
  const m = new Map<string, string>(save ? [[SAVE_KEY, JSON.stringify(save)]] : []);
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};
const won = (to: number) =>
  Object.fromEntries(Array.from({ length: to }, (_, i) => [String(i + 1), { stars: 3, bestMoves: 5 }]));

describe('first night out', () => {
  it('welcomes a new player once', () => {
    const p = new Progress(store());
    expect(needsWelcome(p)).toBe(true);
    p.markIntro('welcomed');
    expect(needsWelcome(p)).toBe(false);
  });

  it("opens Tonight's pour after level 5 and the rest after the first bar, announcing each once", () => {
    const p = new Progress(
      store({ version: 2, levels: won(5), current: 6, intro: { welcomed: true, announced: [], opened: [] } }),
    );
    expect(isBeginner(p)).toBe(true);
    expect(isOpen(p, 'daily')).toBe(true);
    expect(isOpen(p, 'book')).toBe(false);
    expect(toAnnounce(p)).toEqual(['daily']);
    p.markIntro('announced', 'daily');
    expect(toAnnounce(p)).toEqual([]);
    expect(isNew(p, 'daily')).toBe(true);
    p.markIntro('opened', 'daily');
    expect(isNew(p, 'daily')).toBe(false);
  });

  it('treats saves from before the first-run screens as already through it', () => {
    const data = migrate({ version: 2, levels: won(30), current: 31 });
    expect(data.intro).toEqual({
      welcomed: true,
      announced: ['daily', 'book', 'training'],
      opened: ['daily', 'book', 'training'],
    });
    expect(migrate({ version: 2, levels: won(3), current: 4 }).intro.announced).toEqual([]);
    expect(migrate({ version: 2, levels: {}, current: 1 }).intro.welcomed).toBe(false);
  });
});
