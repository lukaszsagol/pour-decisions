import { describe, expect, it } from 'vitest';
import { freshSave, migrate, Progress, SAVE_KEY, type KeyValueStore } from '../src/economy/save.js';

const memory = (): KeyValueStore & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
};

describe('save data', () => {
  it('starts a new player at level 1 with the starting stock', () => {
    const p = new Progress(memory());
    expect(p.data.current).toBe(1);
    expect(p.data).not.toHaveProperty('coins');
    expect(p.data.stock).toEqual({ undo: 5, extraGlass: 2, hint: 3 });
  });

  it('persists and reloads', () => {
    const store = memory();
    const p = new Progress(store);
    p.recordWin({ number: 1, stars: 3, moves: 3, firstTry: true, lastOfBar: false });
    const again = new Progress(store);
    expect(again.level(1)).toEqual({ stars: 3, bestMoves: 3 });
    expect(again.data.current).toBe(2);
    expect(JSON.parse(store.map.get(SAVE_KEY)!).version).toBe(2);
  });

  it('survives corrupt or missing data', () => {
    const store = memory();
    store.setItem(SAVE_KEY, '{not json');
    expect(new Progress(store).data).toEqual(freshSave());
    expect(migrate(null)).toEqual(freshSave());
    expect(migrate({ foo: 1 })).toEqual(freshSave());
  });

  it('upgrades a version-1 save: keeps progress, drops the coins', () => {
    const old = {
      version: 1,
      levels: { '1': { stars: 2, bestMoves: 5 } },
      coins: 50,
      stock: { undo: 1, extraGlass: 0, hint: 0 },
      streak: 0,
      current: 2,
    };
    const m = migrate(old);
    expect(m.version).toBe(2);
    expect(m).not.toHaveProperty('coins');
    expect(m.levels['1']).toEqual({ stars: 2, bestMoves: 5 });
    expect(m.stock).toEqual({ undo: 1, extraGlass: 0, hint: 0 });
    expect(m.settings).toEqual({ muted: false });
  });
});

describe('progress and economy', () => {
  it('keeps the best stars and moves, and pays only for new stars', () => {
    const p = new Progress(memory());
    expect(p.recordWin({ number: 5, stars: 2, moves: 12, firstTry: true, lastOfBar: false }).stars).toBe(2);
    const second = p.recordWin({ number: 5, stars: 3, moves: 10, firstTry: true, lastOfBar: false });
    expect(second.stars).toBe(1);
    expect(p.recordWin({ number: 5, stars: 1, moves: 20, firstTry: true, lastOfBar: false }).stars).toBe(0);
    expect(p.level(5)).toEqual({ stars: 3, bestMoves: 10 });
    expect(p.totalStars()).toBe(3);
  });

  it('gives streak boosters at 3 and 5, and one of each for a first bar finish', () => {
    const p = new Progress(memory());
    for (let n = 1; n <= 3; n++) p.recordWin({ number: n, stars: 3, moves: 3, firstTry: true, lastOfBar: false });
    expect(p.data.streak).toBe(3);
    expect(p.data.stock.undo).toBe(6);
    p.recordWin({ number: 4, stars: 3, moves: 3, firstTry: true, lastOfBar: false });
    p.recordWin({ number: 5, stars: 3, moves: 3, firstTry: true, lastOfBar: false });
    expect(p.data.stock.extraGlass).toBe(3);
    p.recordWin({ number: 20, stars: 1, moves: 9, firstTry: false, lastOfBar: true });
    expect(p.data.stock).toEqual({ undo: 7, extraGlass: 4, hint: 4 });
    // Replaying the bar's last level does not pay again.
    p.recordWin({ number: 20, stars: 3, moves: 9, firstTry: false, lastOfBar: true });
    expect(p.data.stock).toEqual({ undo: 7, extraGlass: 4, hint: 4 });
  });

  it('gives a hint for the first daily finish of a day only', () => {
    const p = new Progress(memory());
    expect(p.recordDaily('2026-11-03', 3, 14, 13).earned).toEqual([{ kind: 'hint', reason: 'daily' }]);
    expect(p.recordDaily('2026-11-03', 3, 12, 13).earned).toEqual([]);
    expect(p.data.stock.hint).toBe(4);
  });

  it('resets the streak on a fail or a retry win', () => {
    const p = new Progress(memory());
    p.recordWin({ number: 1, stars: 3, moves: 3, firstTry: true, lastOfBar: false });
    p.recordFail();
    expect(p.data.streak).toBe(0);
    p.recordWin({ number: 2, stars: 3, moves: 3, firstTry: true, lastOfBar: false });
    p.recordWin({ number: 3, stars: 3, moves: 3, firstTry: false, lastOfBar: false });
    expect(p.data.streak).toBe(0);
  });

  it('unlocks levels in order and never past the last one', () => {
    const p = new Progress(memory(), 3);
    expect(p.isUnlocked(2)).toBe(false);
    p.recordWin({ number: 3, stars: 1, moves: 9, firstTry: true, lastOfBar: false });
    expect(p.data.current).toBe(3);
  });
});
