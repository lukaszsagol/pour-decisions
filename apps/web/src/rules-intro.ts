import type { Bottle } from '@pour/engine';
import type { Theme } from '@pour/themes';
import type { Progress } from './economy/save.js';
import { getLevel } from './levels.js';

/** The special glasses a level can have (docs/spec/rules.md). */
export type Rule = 'locked' | 'only' | 'hidden';

/** What the bartender says the first time a rule shows up in a city. */
export interface RuleIntro {
  rule: Rule;
  /** Save key: each rule is introduced once per city, since every city draws it its own way. */
  key: string;
  /** "New at the bar" the first time; "New look" when the rule is known from another city. */
  kicker: string;
  title: string;
  text: string;
}

/**
 * How each city's art for a rule (named in its theme's `blockers`) is talked about: the glass it
 * marks, and for a locked glass, what happens when it opens.
 */
const LOOKS: Record<string, { glass: string; opens?: string }> = {
  'chains-padlock': { glass: 'the glass in chains', opens: 'the padlock comes off' },
  'locked-tap': { glass: 'the glass with the locked tap', opens: 'the tap unlocks' },
  'deco-door': { glass: 'the glass behind the Art Deco door', opens: 'the door swings open' },
  shutter: { glass: 'the glass behind the shutter', opens: 'the shutter goes up' },
  'stoneware-jug': { glass: 'stoneware jugs' },
  'pewter-tankard': { glass: 'pewter tankards' },
  'frosted-deco-glass': { glass: 'frosted glass' },
  'unlabelled-bottle': { glass: 'unlabelled bottles' },
  'kruik-tag': { glass: 'the glass with the tag' },
  'reserved-beer-mat': { glass: 'the glass on the reserved beer mat' },
  'velvet-rope': { glass: 'the glass behind the velvet rope' },
  'bottle-keep': { glass: 'the glass with the bottle-keep tag' },
};

const TITLES: Record<Rule, string> = { locked: 'Locked glass', only: 'One drink only', hidden: 'Hidden drinks' };

function has(b: Bottle, rule: Rule): boolean {
  if (rule === 'locked') return !!b.lockedUntil;
  if (rule === 'only') return !!b.only;
  return b.units.some((u) => u.hidden);
}

const RULES: readonly Rule[] = ['locked', 'hidden', 'only'];

/** The rules in a level, with the glasses that have each. */
export function rulesIn(bottles: readonly Bottle[]): { rule: Rule; glasses: number[] }[] {
  return RULES.map((rule) => ({
    rule,
    glasses: bottles.flatMap((b, i) => (has(b, rule) ? [i] : [])),
  })).filter((r) => r.glasses.length > 0);
}

/**
 * The rules in this level that the bartender should explain: never introduced in this city,
 * and not already met in a level the player has won (players from before this feature).
 * The first time a rule appears anywhere it's explained in full; in a later city, briefly, as
 * the same rule with a new look.
 */
export function rulesToIntroduce(p: Progress, theme: Theme, bottles: readonly Bottle[]): RuleIntro[] {
  const known = p.data.intro.announced;
  const won = Object.keys(p.data.levels)
    .map((n) => getLevel(Number(n)))
    .filter((e) => e !== undefined);
  const drink = (id?: string) => theme.drinks.find((d) => d.id === id)?.name.toLowerCase() ?? 'that drink';
  return rulesIn(bottles).flatMap(({ rule, glasses }) => {
    const key = `rule:${theme.id}:${rule}`;
    const metHere = won.some((e) => e.pack.city === theme.id && rulesIn(e.level.bottles).some((r) => r.rule === rule));
    if (known.includes(key) || metHere) return [];
    const metBefore =
      known.some((k) => k.startsWith('rule:') && k.endsWith(`:${rule}`)) ||
      won.some((e) => rulesIn(e.level.bottles).some((r) => r.rule === rule));
    const look = LOOKS[theme.blockers[rule]] ?? { glass: 'the marked glass', opens: 'it opens' };
    const first = bottles[glasses[0]!]!;
    const text =
      rule === 'locked'
        ? `See ${look.glass}? It stays shut until another glass is filled to the top with ${drink(first.lockedUntil)}. Then ${look.opens ?? 'it opens'}.`
        : rule === 'only'
          ? `See ${look.glass}? It only takes ${drink(first.only)}: nothing else will pour in.`
          : `Some drinks are hidden under ${look.glass}. You'll see each one once the drinks above it are poured off.`;
    return [{ rule, key, kicker: metBefore ? 'New look' : 'New at the bar', title: TITLES[rule], text }];
  });
}
