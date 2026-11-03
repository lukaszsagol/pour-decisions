import type { BoosterStock, Difficulty } from '@pour/engine';
import { economy, type BoosterKind } from './config.js';
import { rewardsFor, winCoins, type Rewards } from './rewards.js';

export const SAVE_KEY = 'pour-decisions:save';
export const SAVE_VERSION = 1;

export interface LevelRecord {
  stars: number;
  /** Fewest moves in a win. */
  bestMoves: number;
}

export interface SaveData {
  version: 1;
  /** Per-level results, keyed by global level number. */
  levels: Record<string, LevelRecord>;
  coins: number;
  stock: BoosterStock;
  /** Consecutive first-try wins. */
  streak: number;
  /** Highest level the player may play (the next unbeaten one). */
  current: number;
  settings: { muted: boolean };
  /** Daily pour results by date (YYYY-MM-DD). The first finish of the day counts. */
  daily: Record<string, { stars: number; moves: number; best: number }>;
}

/** Minimal storage interface so tests can use memory instead of localStorage. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function freshSave(): SaveData {
  const s = economy.start;
  return {
    version: SAVE_VERSION,
    levels: {},
    coins: s.coins,
    stock: { undo: s.undo, extraGlass: s.extraGlass, hint: s.hint },
    streak: 0,
    current: 1,
    settings: { muted: false },
    daily: {},
  };
}

/**
 * Upgrades older saves step by step. Add a case per version bump:
 * `case 1: data = { ...data, newField: … , version: 2 }` and fall through.
 */
export function migrate(raw: unknown): SaveData {
  if (typeof raw !== 'object' || raw === null) return freshSave();
  let data = raw as { version?: number } & Record<string, unknown>;
  switch (data.version) {
    case undefined:
      return freshSave();
    case 1:
      break;
    default:
      // A save from a newer build: keep it rather than wiping progress.
      if ((data.version ?? 0) > SAVE_VERSION) break;
  }
  data = { ...freshSave(), ...data };
  return data as unknown as SaveData;
}

const memoryStore = (): KeyValueStore => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

function defaultStore(): KeyValueStore {
  try {
    const ls = globalThis.localStorage;
    ls.setItem('pour-decisions:probe', '1');
    ls.removeItem('pour-decisions:probe');
    return ls;
  } catch {
    return memoryStore();
  }
}

/** The player's progress and wallet, saved after every change. */
export class Progress {
  data: SaveData;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly store: KeyValueStore = defaultStore(),
    private readonly maxLevel = 400,
  ) {
    let raw: unknown = null;
    try {
      raw = JSON.parse(store.getItem(SAVE_KEY) ?? 'null');
    } catch {
      raw = null;
    }
    this.data = migrate(raw);
  }

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private commit(): void {
    try {
      this.store.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // Storage full or blocked: keep playing from memory.
    }
    this.listeners.forEach((fn) => fn());
  }

  level(number: number): LevelRecord | undefined {
    return this.data.levels[String(number)];
  }

  totalStars(from = 1, to = this.maxLevel): number {
    let n = 0;
    for (const [k, r] of Object.entries(this.data.levels)) if (Number(k) >= from && Number(k) <= to) n += r.stars;
    return n;
  }

  isUnlocked(number: number): boolean {
    return number <= this.data.current;
  }

  setStock(stock: BoosterStock): void {
    this.data.stock = { ...stock };
    this.commit();
  }

  /** Applies a win: coins, stars, streak and streak booster. */
  recordWin(input: {
    number: number;
    stars: number;
    moves: number;
    difficulty: Difficulty;
    firstTry: boolean;
  }): Rewards {
    const prev = this.level(input.number);
    const rewards = rewardsFor({
      stars: input.stars,
      difficulty: input.difficulty,
      previousStars: prev?.stars ?? 0,
      firstTry: input.firstTry,
      streakBefore: this.data.streak,
    });
    this.data.levels[String(input.number)] = {
      stars: Math.max(prev?.stars ?? 0, input.stars),
      bestMoves: Math.min(prev?.bestMoves ?? Infinity, input.moves),
    };
    this.data.coins += rewards.coins;
    this.data.streak = rewards.streak;
    if (rewards.streakBooster) this.data.stock[rewards.streakBooster]++;
    if (input.number >= this.data.current) this.data.current = Math.min(this.maxLevel, input.number + 1);
    this.commit();
    return rewards;
  }

  /** Records the daily pour. Only the first finish of a day pays coins. */
  recordDaily(date: string, stars: number, moves: number, best: number): Rewards {
    const first = !this.data.daily[date];
    if (first) {
      this.data.daily[date] = { stars, moves, best };
      this.data.coins += winCoins(stars, 'normal');
    }
    this.commit();
    return { coins: first ? winCoins(stars, 'normal') : 0, stars: 0, streak: this.data.streak };
  }

  /** A restart or leaving a level unfinished breaks the first-try streak. */
  recordFail(): void {
    if (this.data.streak === 0) return;
    this.data.streak = 0;
    this.commit();
  }

  /** Buys one booster for coins. Returns false when the player cannot afford it. */
  buyBooster(kind: BoosterKind, price: number = economy.boosterPrice): boolean {
    if (this.data.coins < price) return false;
    this.data.coins -= price;
    this.data.stock[kind]++;
    this.commit();
    return true;
  }

  /** Dead-end continue: an extra glass for coins, only when the player has none. */
  canContinue(): boolean {
    return this.data.stock.extraGlass === 0 && this.data.coins >= economy.deadEndContinue;
  }

  setMuted(muted: boolean): void {
    this.data.settings.muted = muted;
    this.commit();
  }

  reset(): void {
    this.data = freshSave();
    this.commit();
  }
}
