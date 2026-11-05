import { deal, solveAuto, type Bottle } from '@pour/engine';
import { drinksFor, themes, type Theme } from '@pour/themes';

export interface DailyLevel {
  date: string;
  theme: Theme;
  bottles: Bottle[];
  /** Best known pours (may not be optimal: beating it earns a badge). */
  best: number;
  seed: string;
}

/** Local calendar date as YYYY-MM-DD. */
export function dateKey(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "3 Nov" for share text. */
export function shortDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const TARGET_BEST = 22;

/**
 * The level of the day, generated on the device from the date, so everyone
 * gets the same one. Medium difficulty: seven drinks and two spare glasses,
 * the most typical of a few solvable deals. The city rotates with the date.
 */
export function dailyLevel(date: string): DailyLevel {
  const day = Math.floor(Date.UTC(...(date.split('-').map(Number) as [number, number, number])) / 86_400_000);
  const theme = themes[day % themes.length]!;
  const drinks = drinksFor(theme, 7).map((d) => d.id);
  let pick: DailyLevel | null = null;
  for (let k = 0; k < 6; k++) {
    const seed = `daily-${date}-${k}`;
    const bottles = deal({ drinks, empties: 2, seed });
    const r = solveAuto(bottles, { bfsNodes: 40_000, fallbackNodes: 60_000 });
    if (!r.solvable) continue;
    const level = { date, theme, bottles, best: r.moves!.length, seed };
    if (!pick || Math.abs(level.best - TARGET_BEST) < Math.abs(pick.best - TARGET_BEST)) pick = level;
  }
  if (!pick) throw new Error(`No daily level for ${date}`);
  return pick;
}

/** "Pour Decisions · 3 Nov · ★★★ 14 pours (par 13)". */
export function dailyShareText(date: string, stars: number, moves: number, best: number): string {
  return `Pour Decisions · ${shortDate(date)} · ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} ${moves} pours (par ${best})`;
}
