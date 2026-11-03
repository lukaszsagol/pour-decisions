import type { LevelPack, PackLevel } from '@pour/engine';

const modules = import.meta.glob<LevelPack>('../../../levels/*/*.json', { eager: true, import: 'default' });

export interface LevelEntry {
  level: PackLevel;
  pack: LevelPack;
}

/** Level number → level and its pack. */
const byNumber = new Map<number, LevelEntry>();
for (const pack of Object.values(modules)) for (const level of pack.levels) byNumber.set(level.number, { level, pack });

export function getLevel(number: number): LevelEntry | undefined {
  return byNumber.get(number);
}

/** Every available level number, ascending. */
export function levelNumbers(): number[] {
  return [...byNumber.keys()].sort((a, b) => a - b);
}

export function levelsInCity(city: string): LevelEntry[] {
  return [...byNumber.values()].filter((e) => e.pack.city === city).sort((a, b) => a.level.number - b.level.number);
}

/** Packs of a city in bar order. */
export function packsInCity(city: string): LevelPack[] {
  return Object.values(modules)
    .filter((p) => p.city === city)
    .sort((a, b) => a.bar - b.bar);
}
