import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { LevelPack } from '@pour/engine';
import { DRINK_ICONS } from '../src/pixel/level/badge.js';

const root = path.resolve(import.meta.dirname, '../../../levels');

describe('release badge icons', () => {
  it('has a drawing for every drink that releases a lock or owns an only-glass', () => {
    const needed = new Set<string>();
    for (const city of fs.readdirSync(root))
      for (const f of fs.readdirSync(path.join(root, city))) {
        const pack = JSON.parse(fs.readFileSync(path.join(root, city, f), 'utf8')) as LevelPack;
        for (const l of pack.levels)
          for (const b of l.bottles) {
            if (b.lockedUntil) needed.add(b.lockedUntil);
            if (b.only) needed.add(b.only);
          }
      }
    expect(needed.size).toBeGreaterThan(20);
    expect([...needed].filter((id) => !DRINK_ICONS[id])).toEqual([]);
  });
});
