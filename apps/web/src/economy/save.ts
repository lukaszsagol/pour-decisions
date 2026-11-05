import type { BoosterStock } from '@pour/engine';
import { economy } from './config.js';
import { rewardsFor, type Rewards } from './rewards.js';
import type { TrainingSession } from '../training/logic.js';
import { FEATURES, OPENS_AFTER } from '../onboarding.js';

export const SAVE_KEY = 'pour-decisions:save';
export const SAVE_VERSION = 2;

export interface LevelRecord {
  stars: number;
  /** Fewest moves in a win. */
  bestMoves: number;
}

export interface SaveData {
  version: 2;
  /** Per-level results, keyed by global level number. */
  levels: Record<string, LevelRecord>;
  stock: BoosterStock;
  /** Consecutive first-try wins. */
  streak: number;
  /** Highest level the player may play (the next unbeaten one). */
  current: number;
  settings: { muted: boolean };
  /** Daily pour results by date (YYYY-MM-DD). The first finish of the day counts. */
  daily: Record<string, { stars: number; moves: number; best: number }>;
  /** Brain-training: adaptive rating and past sessions (newest last, 200 kept). */
  training: { rating: number; sessions: TrainingSession[] };
  /**
   * First-run: the welcome screen was seen; features already announced when they opened; and
   * features opened at least once (their tab shows NEW until then). See `src/onboarding.ts`.
   */
  intro: { welcomed: boolean; announced: string[]; opened: string[] };
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
    stock: { undo: s.undo, extraGlass: s.extraGlass, hint: s.hint },
    streak: 0,
    current: 1,
    settings: { muted: false },
    daily: {},
    training: { rating: 2, sessions: [] },
    intro: { welcomed: false, announced: [], opened: [] },
  };
}

/**
 * Upgrades older saves step by step: each version upgrades to the next.
 * Add a step per version bump.
 */
export function migrate(raw: unknown): SaveData {
  if (typeof raw !== 'object' || raw === null) return freshSave();
  let data = raw as { version?: number } & Record<string, unknown>;
  if (data.version === undefined) return freshSave();
  if (data.version === 1) {
    // Version 2 drops coins: there is no currency any more (owner, 2026-11-03).
    const { coins: _coins, ...rest } = data;
    data = { ...rest, version: 2 };
  }
  // Saves from before the first-run screens: anyone who has played already knows the game, so
  // they skip the welcome and every feature open to them counts as announced and opened.
  if (!data.intro) {
    const played = Object.keys((data.levels as Record<string, unknown> | undefined) ?? {}).length > 0;
    const current = typeof data.current === 'number' ? data.current : 1;
    const open = played ? FEATURES.filter((f) => current > OPENS_AFTER[f]) : [];
    data = { ...data, intro: { welcomed: played, announced: open, opened: open } };
  }
  // A save from a newer build is kept as it is rather than wiping progress.
  return { ...freshSave(), ...data } as unknown as SaveData;
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

/** The player's progress and boosters, saved after every change. */
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

  /** Levels solved in the fewest pours (three stars). */
  perfectCount(): number {
    return Object.values(this.data.levels).filter((r) => r.stars === 3).length;
  }

  isUnlocked(number: number): boolean {
    return number <= this.data.current;
  }

  setStock(stock: BoosterStock): void {
    this.data.stock = { ...stock };
    this.commit();
  }

  /** Applies a win: stars, streak, and boosters earned (streak milestones, a bar finished for the first time). */
  recordWin(input: { number: number; stars: number; moves: number; firstTry: boolean; lastOfBar: boolean }): Rewards {
    const prev = this.level(input.number);
    const rewards = rewardsFor({
      stars: input.stars,
      previousStars: prev?.stars ?? 0,
      firstTry: input.firstTry,
      streakBefore: this.data.streak,
      barFinished: input.lastOfBar && !prev,
    });
    this.data.levels[String(input.number)] = {
      stars: Math.max(prev?.stars ?? 0, input.stars),
      bestMoves: Math.min(prev?.bestMoves ?? Infinity, input.moves),
    };
    this.data.streak = rewards.streak;
    for (const e of rewards.earned) this.data.stock[e.kind]++;
    if (input.number >= this.data.current) this.data.current = Math.min(this.maxLevel, input.number + 1);
    this.commit();
    return rewards;
  }

  /** Records the daily pour. The first finish of a day earns a hint. */
  recordDaily(date: string, stars: number, moves: number, best: number): Rewards {
    const first = !this.data.daily[date];
    const earned = first ? economy.daily.map((kind) => ({ kind, reason: 'daily' as const })) : [];
    if (first) this.data.daily[date] = { stars, moves, best };
    for (const e of earned) this.data.stock[e.kind]++;
    this.commit();
    return { stars: 0, streak: this.data.streak, earned };
  }

  recordTraining(session: TrainingSession): void {
    const t = this.data.training;
    t.sessions.push(session);
    if (t.sessions.length > 200) t.sessions.splice(0, t.sessions.length - 200);
    t.rating = session.rating;
    this.commit();
  }

  /** A restart or leaving a level unfinished breaks the first-try streak. */
  recordFail(): void {
    if (this.data.streak === 0) return;
    this.data.streak = 0;
    this.commit();
  }

  /** First-run bookkeeping: the welcome was seen, a feature was announced, or opened. */
  markIntro(kind: 'welcomed' | 'announced' | 'opened', feature?: string): void {
    const intro = this.data.intro;
    if (kind === 'welcomed') {
      if (intro.welcomed) return;
      intro.welcomed = true;
    } else {
      if (!feature || intro[kind].includes(feature)) return;
      intro[kind].push(feature);
    }
    this.commit();
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
