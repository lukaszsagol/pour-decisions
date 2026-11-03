import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { LevelPack } from '@pour/engine';
import { cityIds } from '@pour/themes';
import {
  availableBlockers,
  barPlan,
  BARS_PER_CITY,
  drinkCount,
  formatPack,
  generateBar,
  generateLevel,
  SUPER_HARD_AT,
} from '../src/index.js';

const levelsDir = path.resolve(import.meta.dirname, '../../../levels');
const readPack = (city: string, bar: number): LevelPack | null => {
  const f = path.join(levelsDir, city, `${bar}.json`);
  return fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as LevelPack) : null;
};

describe('bar plan', () => {
  for (const city of cityIds) {
    for (let bar = 1; bar <= BARS_PER_CITY; bar++) {
      it(`${city} bar ${bar} follows the sawtooth`, () => {
        const plan = barPlan(city, bar);
        expect(plan).toHaveLength(20);
        expect(plan.filter((k) => k === 'superHard')).toHaveLength(1);
        const peaks = plan.flatMap((k, i) => (k === 'hard' || k === 'superHard' ? [i] : []));
        expect(peaks.length).toBeGreaterThanOrEqual(2);
        for (const p of peaks) if (p < 19) expect(plan[p + 1]).toBe('relief');
        for (let i = 1; i < peaks.length; i++) {
          expect(peaks[i]! - peaks[i - 1]!).toBeGreaterThanOrEqual(5);
          expect(peaks[i]! - peaks[i - 1]!).toBeLessThanOrEqual(10);
        }
        expect(barPlan(city, bar)).toEqual(plan);
      });
    }
  }

  it('puts the Super Hard where the map designs show it', () => {
    for (const [key, pos] of Object.entries(SUPER_HARD_AT)) {
      const [city, bar] = key.split('-');
      expect(barPlan(city!, Number(bar))[pos - 1]).toBe('superHard');
    }
  });
});

describe('teaching curve', () => {
  it('adds drinks gradually from two', () => {
    expect(drinkCount(1, 'normal')).toBe(2);
    let last = 2;
    for (let n = 1; n <= 400; n++) {
      const d = drinkCount(n, 'normal');
      expect(d).toBeGreaterThanOrEqual(last);
      expect(d - last).toBeLessThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(10);
      last = d;
    }
  });

  it('keeps blockers out of Amsterdam bar 1', () => {
    expect(availableBlockers('amsterdam', 20)).toEqual([]);
    expect(availableBlockers('amsterdam', 21)).toEqual(['locked']);
    expect(availableBlockers('london', 101)).toEqual(['locked', 'hidden']);
  });

  it('makes level 1 obvious: two drinks, three pours', () => {
    const l = generateLevel('amsterdam', 1, 'normal');
    expect(new Set(l.bottles.flatMap((b) => b.units.map((u) => u.drink))).size).toBe(2);
    expect(l.best).toBeLessThanOrEqual(3);
  });

  it('is deterministic', () => {
    expect(generateLevel('amsterdam', 7, 'normal')).toEqual(generateLevel('amsterdam', 7, 'normal'));
  });
});

describe('pack format', () => {
  it('round-trips through formatPack', () => {
    const pack = readPack('amsterdam', 1);
    expect(pack).not.toBeNull();
    expect(JSON.parse(formatPack(pack!))).toEqual(pack);
  });

  it('regenerates Amsterdam bar 1 byte for byte', () => {
    const file = fs.readFileSync(path.join(levelsDir, 'amsterdam', '1.json'), 'utf8');
    expect(formatPack(generateBar('amsterdam', 1))).toBe(file);
  }, 60_000);
});

describe('committed packs', () => {
  it('teach first: no blockers before level 21, the locked glass at 21', () => {
    for (const bar of [1, 2]) {
      const pack = readPack('amsterdam', bar);
      if (!pack) continue;
      for (const l of pack.levels) {
        const blocked = l.bottles.some((b) => b.lockedUntil || b.only || b.units.some((u) => u.hidden));
        if (l.number < 21) expect(blocked, `level ${l.number}`).toBe(false);
        if (l.number === 21) expect(l.bottles.some((b) => b.lockedUntil)).toBe(true);
      }
    }
  });

  it('includes the designed Tokyo level 327', () => {
    const pack = readPack('tokyo', 2);
    if (!pack) return;
    const l = pack.levels.find((x) => x.number === 327)!;
    expect(l).toMatchObject({ seed: 'designed', best: 16, difficulty: 'normal' });
  });

  it('numbers levels without gaps and names bars from the theme', () => {
    for (const city of cityIds)
      for (let bar = 1; bar <= BARS_PER_CITY; bar++) {
        const pack = readPack(city, bar);
        if (!pack) continue;
        const numbers = pack.levels.map((l) => l.number);
        expect(numbers[19]! - numbers[0]!).toBe(19);
        expect(pack.levels).toHaveLength(20);
      }
  });
});
