import {
  canPour,
  cloneBottles,
  isComplete,
  isDeadEnd,
  isLocked,
  isWon,
  legalMoves,
  pour,
  settle,
  top,
} from './rules.js';
import { solveAuto } from './search.js';
import type { Bottle, Move } from './types.js';

/** Boosters the player owns. The game spends them; the economy refills them. */
export interface BoosterStock {
  undo: number;
  extraGlass: number;
  hint: number;
}

export type GameStatus = 'playing' | 'won' | 'deadEnd';

export type TapEvent =
  | { type: 'selected'; index: number }
  | { type: 'deselected'; index: number }
  | { type: 'poured'; from: number; to: number; amount: number; completed: boolean; unlocked: number[] }
  | { type: 'rejected'; index: number }
  | { type: 'ignored'; index: number };

export interface GameOptions {
  /** Fewest pours that solve the level, from the level pack. */
  best: number;
  stock?: BoosterStock;
  /** Node budget for hint searches. */
  hintBudget?: number;
}

export interface GameSnapshot {
  version: 1;
  start: Bottle[];
  bottles: Bottle[];
  history: Bottle[][];
  moves: number;
  best: number;
  stock: BoosterStock;
  extraGlassUsed: boolean;
  usedBoosters: number;
}

/**
 * Stars per `docs/spec/rules.md`, before the extra-glass cap: three only for
 * the fewest pours (no wasted pour, and undo gives none back), two within
 * about a third more.
 */
export function starsFor(moves: number, best: number): 1 | 2 | 3 {
  if (moves <= best) return 3;
  if (moves <= twoStarPours(best)) return 2;
  return 1;
}

/** The most pours that still earn two stars. */
export function twoStarPours(best: number): number {
  return Math.max(best + 1, Math.floor(best * 1.35));
}

/**
 * One play-through of a level. The client drives it with taps and booster
 * calls and renders `bottles` after each event.
 */
export class Game {
  readonly start: Bottle[];
  readonly best: number;
  bottles: Bottle[];
  history: Bottle[][] = [];
  moves = 0;
  stock: BoosterStock;
  selected: number | null = null;
  extraGlassUsed = false;
  /** Boosters spent in this attempt, for the play log and first-try streaks. */
  usedBoosters = 0;
  private readonly hintBudget: number;

  constructor(start: readonly Bottle[], options: GameOptions) {
    this.start = cloneBottles(start);
    settle(this.start);
    this.bottles = cloneBottles(this.start);
    this.best = options.best;
    this.stock = { ...(options.stock ?? { undo: 0, extraGlass: 0, hint: 0 }) };
    this.hintBudget = options.hintBudget ?? 200_000;
  }

  get status(): GameStatus {
    if (isWon(this.bottles)) return 'won';
    if (isDeadEnd(this.bottles)) return 'deadEnd';
    return 'playing';
  }

  /** First tap selects, second tap pours, re-taps deselect. Illegal targets are rejected and keep the selection. */
  tap(index: number): TapEvent {
    const bottle = this.bottles[index];
    if (!bottle || this.status === 'won') return { type: 'ignored', index };
    if (this.selected === null) {
      if (!this.canSelect(index)) return { type: isLocked(bottle) ? 'rejected' : 'ignored', index };
      this.selected = index;
      return { type: 'selected', index };
    }
    if (this.selected === index) {
      this.selected = null;
      return { type: 'deselected', index };
    }
    const from = this.selected;
    if (!canPour(this.bottles, { from, to: index })) return { type: 'rejected', index };
    return this.pour({ from, to: index });
  }

  canSelect(index: number): boolean {
    const b = this.bottles[index];
    if (!b || isLocked(b)) return false;
    const t = top(b);
    return t !== undefined && !t.hidden;
  }

  /** Applies a legal pour directly (used by taps, bots and replays). */
  pour(move: Move): TapEvent & { type: 'poured' } {
    const before = this.bottles;
    const { bottles, amount } = pour(before, move);
    this.history.push(before);
    this.bottles = bottles;
    this.moves++;
    this.selected = null;
    const unlocked = bottles.flatMap((b, i) => (isLocked(before[i]!) && !isLocked(b) ? [i] : []));
    return { type: 'poured', from: move.from, to: move.to, amount, completed: isComplete(bottles[move.to]!), unlocked };
  }

  canUndo(): boolean {
    return this.history.length > 0 && this.stock.undo > 0;
  }

  /** Restores the previous position. The move count is not reduced. */
  undo(): boolean {
    if (!this.canUndo()) return false;
    this.bottles = this.history.pop()!;
    this.stock.undo--;
    this.usedBoosters++;
    this.selected = null;
    return true;
  }

  canAddGlass(): boolean {
    return !this.extraGlassUsed && this.stock.extraGlass > 0 && this.status !== 'won';
  }

  /** Adds one empty bottle, once per level. Caps the result at 2 stars. */
  addGlass(): boolean {
    if (!this.canAddGlass()) return false;
    const capacity = this.bottles[0]?.capacity ?? 4;
    this.bottles = [...cloneBottles(this.bottles), { units: [], capacity }];
    // Earlier positions get the glass too, so undo never removes it.
    this.history = this.history.map((h) => [...h, { units: [], capacity }]);
    this.extraGlassUsed = true;
    this.stock.extraGlass--;
    this.usedBoosters++;
    this.selected = null;
    return true;
  }

  /** A useful pour from the current position, without spending anything. */
  suggest(): Move | null {
    if (this.status !== 'playing') return null;
    const r = solveAuto(this.bottles, { bfsNodes: this.hintBudget, fallbackNodes: this.hintBudget });
    if (r.solvable && r.moves && r.moves.length > 0) return r.moves[0]!;
    return legalMoves(this.bottles)[0] ?? null;
  }

  canHint(): boolean {
    return this.stock.hint > 0 && this.status === 'playing';
  }

  /** Spends a hint and returns the pour to highlight. */
  hint(): Move | null {
    if (!this.canHint()) return null;
    const move = this.suggest();
    if (!move) return null;
    this.stock.hint--;
    this.usedBoosters++;
    this.selected = null;
    return move;
  }

  /** Back to the starting layout. Spent boosters are not refunded. */
  restart(): void {
    this.bottles = cloneBottles(this.start);
    this.history = [];
    this.moves = 0;
    this.selected = null;
    this.extraGlassUsed = false;
  }

  stars(): 0 | 1 | 2 | 3 {
    if (this.status !== 'won') return 0;
    const s = starsFor(this.moves, this.best);
    return this.extraGlassUsed ? (Math.min(s, 2) as 1 | 2) : s;
  }

  /** Matched the solver's best exactly, without the extra glass. */
  get perfect(): boolean {
    return this.status === 'won' && !this.extraGlassUsed && this.moves === this.best;
  }

  /** Fewer pours than the recorded best (possible on device-generated levels). */
  get beatComputer(): boolean {
    return this.status === 'won' && !this.extraGlassUsed && this.moves < this.best;
  }

  toJSON(): GameSnapshot {
    return {
      version: 1,
      start: cloneBottles(this.start),
      bottles: cloneBottles(this.bottles),
      history: this.history.map((h) => cloneBottles(h)),
      moves: this.moves,
      best: this.best,
      stock: { ...this.stock },
      extraGlassUsed: this.extraGlassUsed,
      usedBoosters: this.usedBoosters,
    };
  }

  static fromJSON(data: GameSnapshot): Game {
    if (data.version !== 1) throw new Error(`Unknown game snapshot version ${String(data.version)}`);
    const g = new Game(data.start, { best: data.best, stock: data.stock });
    g.bottles = cloneBottles(data.bottles);
    g.history = data.history.map((h) => cloneBottles(h));
    g.moves = data.moves;
    g.extraGlassUsed = data.extraGlassUsed;
    g.usedBoosters = data.usedBoosters;
    return g;
  }
}
