import { describe, expect, it } from 'vitest';
import { Game, parseBottles, solve, starsFor } from '../src/index.js';
import { chained, stuck, tiny, tokyo327 } from './fixtures.js';

const stock = () => ({ undo: 5, extraGlass: 2, hint: 3 });

describe('Game taps', () => {
  it('selects, deselects and pours', () => {
    const g = new Game(tiny(), { best: 3, stock: stock() });
    expect(g.tap(0)).toEqual({ type: 'selected', index: 0 });
    expect(g.tap(0)).toEqual({ type: 'deselected', index: 0 });
    g.tap(0);
    const e = g.tap(2);
    expect(e).toMatchObject({ type: 'poured', from: 0, to: 2, amount: 1 });
    expect(g.moves).toBe(1);
    expect(g.selected).toBeNull();
  });

  it('rejects an illegal target and keeps the selection', () => {
    const g = new Game(parseBottles(['red blue', 'blue red', ''], 2), { best: 3 });
    g.tap(0);
    expect(g.tap(1)).toEqual({ type: 'rejected', index: 1 });
    expect(g.selected).toBe(0);
    expect(g.moves).toBe(0);
  });

  it('ignores a first tap on an empty glass and rejects a locked one', () => {
    const g = new Game(chained(), { best: 5 });
    expect(g.tap(2).type).toBe('ignored');
    expect(g.tap(3).type).toBe('rejected');
    expect(g.selected).toBeNull();
  });

  it('reports glasses unlocked by a pour', () => {
    const g = new Game(parseBottles(['cherry cherry cherry', 'cherry', '', ''], 4, { 3: { lockedUntil: 'cherry' } }), {
      best: 1,
    });
    g.tap(1);
    expect(g.tap(0)).toMatchObject({ type: 'poured', completed: true, unlocked: [3] });
  });
});

describe('Game boosters', () => {
  it('undo restores the position, keeps the move count and spends one undo', () => {
    const g = new Game(tiny(), { best: 3, stock: stock() });
    const before = JSON.stringify(g.bottles);
    g.tap(0);
    g.tap(2);
    expect(g.undo()).toBe(true);
    expect(JSON.stringify(g.bottles)).toBe(before);
    expect(g.moves).toBe(1);
    expect(g.stock.undo).toBe(4);
  });

  it('undo needs history and stock', () => {
    const g = new Game(tiny(), { best: 3, stock: { undo: 0, extraGlass: 0, hint: 0 } });
    expect(g.undo()).toBe(false);
    g.tap(0);
    g.tap(2);
    expect(g.undo()).toBe(false);
  });

  it('adds one extra glass per level and caps stars at 2', () => {
    const g = new Game(stuck(), { best: 2, stock: stock() });
    expect(g.status).toBe('deadEnd');
    expect(g.addGlass()).toBe(true);
    expect(g.bottles).toHaveLength(3);
    expect(g.stock.extraGlass).toBe(1);
    expect(g.addGlass()).toBe(false);
    expect(g.status).toBe('playing');
    for (const m of solve(g.bottles).moves!) g.pour(m);
    expect(g.status).toBe('won');
    expect(g.stars()).toBe(2);
    expect(g.perfect).toBe(false);
  });

  it('keeps the extra glass through undo', () => {
    const g = new Game(tiny(), { best: 3, stock: stock() });
    g.tap(0);
    g.tap(2);
    g.addGlass();
    g.undo();
    expect(g.bottles).toHaveLength(4);
  });

  it('hint returns a pour on a solution path and spends a hint', () => {
    const g = new Game(tokyo327(), { best: 16, stock: stock() });
    const move = g.hint()!;
    expect(move).toBeTruthy();
    expect(g.stock.hint).toBe(2);
    g.pour(move);
    const rest = solve(g.bottles);
    expect(rest.moves!.length).toBe(15);
  });

  it('hint falls back to any legal pour when the level cannot be solved', () => {
    const g = new Game(parseBottles(['a b', 'b a', ''], 2), { best: 1, stock: stock(), hintBudget: 1 });
    expect(g.hint()).not.toBeNull();
  });

  it('hint does nothing without stock', () => {
    const g = new Game(tiny(), { best: 3 });
    expect(g.hint()).toBeNull();
  });
});

describe('Game status and stars', () => {
  it('detects a dead end', () => {
    expect(new Game(stuck(), { best: 1 }).status).toBe('deadEnd');
  });

  it('gives three stars only for the fewest pours', () => {
    expect(starsFor(16, 16)).toBe(3);
    expect(starsFor(15, 16)).toBe(3);
    expect(starsFor(17, 16)).toBe(2);
    expect(starsFor(21, 16)).toBe(2);
    expect(starsFor(22, 16)).toBe(1);
    expect(starsFor(4, 3)).toBe(2);
    expect(starsFor(5, 3)).toBe(1);
  });

  it("plays Tokyo 327's solver solution to a 3-star perfect win", () => {
    const moves = solve(tokyo327()).moves!;
    const g = new Game(tokyo327(), { best: 16, stock: stock() });
    for (const m of moves) {
      g.tap(m.from);
      expect(g.tap(m.to).type).toBe('poured');
    }
    expect(g.status).toBe('won');
    expect(g.moves).toBe(16);
    expect(g.stars()).toBe(3);
    expect(g.perfect).toBe(true);
    expect(g.tap(0).type).toBe('ignored');
  });

  it('undo counts against stars', () => {
    const moves = solve(tiny()).moves!;
    const g = new Game(tiny(), { best: moves.length, stock: stock() });
    g.pour(moves[0]!);
    g.undo();
    for (const m of moves) g.pour(m);
    expect(g.moves).toBe(moves.length + 1);
    expect(g.perfect).toBe(false);
  });

  it('restart returns to the start without refunding boosters', () => {
    const g = new Game(tiny(), { best: 3, stock: stock() });
    g.tap(0);
    g.tap(2);
    g.addGlass();
    g.restart();
    expect(g.moves).toBe(0);
    expect(g.bottles).toHaveLength(3);
    expect(g.stock.extraGlass).toBe(1);
  });
});

describe('Game serialisation', () => {
  it('round-trips through JSON mid-level', () => {
    const g = new Game(tokyo327(), { best: 16, stock: stock() });
    const moves = solve(tokyo327()).moves!;
    g.pour(moves[0]!);
    g.pour(moves[1]!);
    g.undo();
    const copy = Game.fromJSON(JSON.parse(JSON.stringify(g)));
    expect(copy.toJSON()).toEqual(g.toJSON());
    copy.pour(moves[1]!);
    expect(copy.moves).toBe(3);
  });

  it('refuses unknown versions', () => {
    const data = { ...new Game(tiny(), { best: 3 }).toJSON(), version: 2 } as unknown as ReturnType<Game['toJSON']>;
    expect(() => Game.fromJSON(data)).toThrow();
  });
});
