import { describe, expect, it } from 'vitest';
import { LOG_KEY, LOG_LIMIT, PlayLog } from '../src/playlog.js';

const memory = () => {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
};

describe('play log', () => {
  it('records events with time and level, and persists them', () => {
    const store = memory();
    let now = 1000;
    const log = new PlayLog(store, () => now++);
    log.add(5, { type: 'start', level: 5 });
    log.add(5, { type: 'pour', from: 0, to: 2, moves: 1 });
    log.add(5, { type: 'booster', booster: 'undo' });
    log.add(5, { type: 'booster', booster: 'hint' });
    log.add(5, { type: 'win', moves: 9, stars: 3 });
    expect(log.all().map((e) => e.type)).toEqual(['start', 'pour', 'undo', 'booster', 'win']);
    expect(log.all()[1]).toEqual({ t: 1001, level: 5, type: 'pour', from: 0, to: 2, moves: 1 });
    expect(new PlayLog(store).all()).toHaveLength(5);
    expect(JSON.parse(store.map.get(LOG_KEY)!)).toHaveLength(5);
  });

  it('exports a versioned file and can be cleared', () => {
    const log = new PlayLog(memory(), () => 0);
    log.add('daily-2026-11-03', { type: 'quit', moves: 4 });
    expect(log.export()).toMatchObject({
      version: 1,
      exportedAt: '1970-01-01T00:00:00.000Z',
      events: [{ type: 'quit' }],
    });
    log.clear();
    expect(log.all()).toHaveLength(0);
  });

  it('keeps only the newest events', () => {
    const log = new PlayLog(memory());
    for (let i = 0; i < LOG_LIMIT + 10; i++) log.add(1, { type: 'pour', n: i });
    expect(log.all()).toHaveLength(LOG_LIMIT);
    expect(log.all()[0]!.n).toBe(10);
  });
});
