import type { KeyValueStore } from './economy/save.js';

export const LOG_KEY = 'pour-decisions:log';
export const LOG_VERSION = 1;
/** Oldest events are dropped beyond this many. */
export const LOG_LIMIT = 5000;

export type PlayEventType = 'start' | 'pour' | 'undo' | 'booster' | 'deadEnd' | 'restart' | 'win' | 'quit';

/** One line of the play log. See `docs/spec/levels.md` for the format. */
export interface PlayEvent {
  /** Milliseconds since the epoch. */
  t: number;
  /** Global level number, or "daily-YYYY-MM-DD". */
  level: number | string;
  type: PlayEventType;
  [key: string]: unknown;
}

export interface PlayLogExport {
  version: number;
  exportedAt: string;
  events: PlayEvent[];
}

/** Local log of play events, for tuning difficulty later. Never leaves the device unless exported. */
export class PlayLog {
  private events: PlayEvent[];

  constructor(
    private readonly store: KeyValueStore | null = safeLocalStorage(),
    private readonly now: () => number = Date.now,
  ) {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(store?.getItem(LOG_KEY) ?? 'null');
    } catch {
      parsed = null;
    }
    this.events = Array.isArray(parsed) ? (parsed as PlayEvent[]) : [];
  }

  add(level: number | string, event: { type: string; [key: string]: unknown }): void {
    const { type, ...data } = event;
    // Boosters arrive as { type: 'booster', booster: 'undo' }; undo gets its own type.
    const t: PlayEventType = type === 'booster' && data.booster === 'undo' ? 'undo' : (type as PlayEventType);
    this.events.push({ t: this.now(), level, type: t, ...data });
    if (this.events.length > LOG_LIMIT) this.events.splice(0, this.events.length - LOG_LIMIT);
    try {
      this.store?.setItem(LOG_KEY, JSON.stringify(this.events));
    } catch {
      // Full storage: keep the log in memory for this session.
    }
  }

  all(): readonly PlayEvent[] {
    return this.events;
  }

  export(): PlayLogExport {
    return { version: LOG_VERSION, exportedAt: new Date(this.now()).toISOString(), events: [...this.events] };
  }

  clear(): void {
    this.events = [];
    this.store?.removeItem(LOG_KEY);
  }
}

function safeLocalStorage(): KeyValueStore | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Offers the log as a JSON file download. */
export function downloadLog(log: PlayLog): void {
  const blob = new Blob([JSON.stringify(log.export(), null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pour-decisions-log-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
