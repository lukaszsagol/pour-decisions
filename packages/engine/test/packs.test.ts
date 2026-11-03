import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { solve, validatePack, type LevelPack } from '../src/index.js';

const root = path.resolve(import.meta.dirname, '../../../levels');

/** Every committed level pack, read from disk. */
export function readPacks(): { file: string; pack: LevelPack }[] {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root)
    .flatMap((city) =>
      fs
        .readdirSync(path.join(root, city))
        .filter((f) => f.endsWith('.json'))
        .map((f) => path.join(city, f)),
    )
    .map((file) => ({ file, pack: JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')) as LevelPack }));
}

describe('committed level packs', () => {
  const packs = readPacks();

  it('exist', () => {
    expect(packs.length).toBeGreaterThan(0);
  });

  for (const { file, pack } of packs) {
    it(`${file} is valid and every level solves in exactly best pours`, () => {
      expect(validatePack(pack)).toEqual([]);
      for (const level of pack.levels) {
        const r = solve(level.bottles, { maxNodes: 2_000_000 });
        expect(r.solvable, `level ${level.number}`).toBe(true);
        expect(r.moves!.length, `level ${level.number}`).toBe(level.best);
      }
    });
  }
});
