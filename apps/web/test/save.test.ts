import { describe, expect, it } from 'vitest';
import { economy } from '../src/economy/config.js';
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
    expect(p.data.coins).toBe(economy.start.coins);
    expect(p.data.stock).toEqual({ undo: 5, extraGlass: 2, hint: 3 });
  });

  it('persists and reloads', () => {
    const store = memory();
    const p = new Progress(store);
    p.recordWin({ number: 1, stars: 3, moves: 3, difficulty: 'normal', firstTry: true });
    const again = new Progress(store);
    expect(again.level(1)).toEqual({ stars: 3, bestMoves: 3 });
    expect(again.data.current).toBe(2);
    expect(JSON.parse(store.map.get(SAVE_KEY)!).version).toBe(1);
  });

  it('survives corrupt or missing data', () => {
    const store = memory();
    store.setItem(SAVE_KEY, '{not json');
    expect(new Progress(store).data).toEqual(freshSave());
    expect(migrate(null)).toEqual(freshSave());
    expect(migrate({ foo: 1 })).toEqual(freshSave());
  });

  it('fills in fields missing from an older version-1 save', () => {
    const old = {
      version: 1,
      levels: { '1': { stars: 2, bestMoves: 5 } },
      coins: 50,
      stock: { undo: 1, extraGlass: 0, hint: 0 },
      streak: 0,
      current: 2,
    };
    expect(migrate(old).settings).toEqual({ muted: false });
    expect(migrate(old).coins).toBe(50);
  });
});

describe('progress and economy', () => {
  it('keeps the best stars and moves, and pays only for new stars', () => {
    const p = new Progress(memory());
    expect(p.recordWin({ number: 5, stars: 2, moves: 12, difficulty: 'normal', firstTry: true }).stars).toBe(2);
    const second = p.recordWin({ number: 5, stars: 3, moves: 10, difficulty: 'normal', firstTry: true });
    expect(second.stars).toBe(1);
    expect(p.recordWin({ number: 5, stars: 1, moves: 20, difficulty: 'normal', firstTry: true }).stars).toBe(0);
    expect(p.level(5)).toEqual({ stars: 3, bestMoves: 10 });
    expect(p.totalStars()).toBe(3);
  });

  it('pays coins and gives streak boosters at 3, 5 and 10', () => {
    const p = new Progress(memory());
    const start = p.data.coins;
    for (let n = 1; n <= 3; n++) p.recordWin({ number: n, stars: 3, moves: 3, difficulty: 'normal', firstTry: true });
    expect(p.data.coins).toBe(start + 3 * 40);
    expect(p.data.streak).toBe(3);
    expect(p.data.stock.undo).toBe(6);
    p.recordWin({ number: 4, stars: 3, moves: 3, difficulty: 'normal', firstTry: true });
    p.recordWin({ number: 5, stars: 3, moves: 3, difficulty: 'normal', firstTry: true });
    expect(p.data.stock.extraGlass).toBe(3);
  });

  it('resets the streak on a fail or a retry win', () => {
    const p = new Progress(memory());
    p.recordWin({ number: 1, stars: 3, moves: 3, difficulty: 'normal', firstTry: true });
    p.recordFail();
    expect(p.data.streak).toBe(0);
    p.recordWin({ number: 2, stars: 3, moves: 3, difficulty: 'normal', firstTry: true });
    p.recordWin({ number: 3, stars: 3, moves: 3, difficulty: 'normal', firstTry: false });
    expect(p.data.streak).toBe(0);
  });

  it('sells boosters and the dead-end continue for coins', () => {
    const p = new Progress(memory());
    expect(p.canContinue()).toBe(false);
    p.setStock({ undo: 0, extraGlass: 0, hint: 0 });
    expect(p.canContinue()).toBe(true);
    expect(p.buyBooster('extraGlass')).toBe(true);
    expect(p.data.coins).toBe(0);
    expect(p.buyBooster('hint')).toBe(false);
    expect(p.canContinue()).toBe(false);
  });

  it('unlocks levels in order and never past the last one', () => {
    const p = new Progress(memory(), 3);
    expect(p.isUnlocked(2)).toBe(false);
    p.recordWin({ number: 3, stars: 1, moves: 9, difficulty: 'normal', firstTry: true });
    expect(p.data.current).toBe(3);
  });
});
