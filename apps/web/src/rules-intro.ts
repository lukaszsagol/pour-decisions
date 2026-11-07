import type { Bottle } from '@pour/engine';
import type { Theme } from '@pour/themes';
import type { Progress } from './economy/save.js';
import { getLevel } from './levels.js';

/** The special glasses a level can have (docs/spec/rules.md). */
export type Rule = 'locked' | 'only' | 'hidden';

/** What the bartender says the first time a rule shows up, and which glasses to point at. */
export interface RuleIntro {
  rule: Rule;
  /** Save key: each rule is introduced once per city, since every city draws it its own way. */
  key: string;
  title: string;
  text: string;
  glasses: number[];
}

/** How each city draws a rule, by the blocker art named in its theme. */
const LOOKS: Record<string, string> = {
  'chains-padlock': 'chains and a padlock',
  'locked-tap': 'a locked tap',
  'deco-door': 'an Art Deco door',
  shutter: 'a shutter',
  'stoneware-jug': 'a stoneware jug',
  'pewter-tankard': 'a pewter tankard',
  'frosted-deco-glass': 'frosted glass',
  'unlabelled-bottle': 'an unlabelled bottle',
  'kruik-tag': 'a tag',
  'reserved-beer-mat': 'a reserved beer mat',
  'velvet-rope': 'a velvet rope',
  'bottle-keep': 'a bottle-keep tag',
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
  const drink = (id?: string) => theme.drinks.find((d) => d.id === id)?.name ?? 'that drink';
  return rulesIn(bottles).flatMap(({ rule, glasses }) => {
    const key = `rule:${theme.id}:${rule}`;
    const metHere = won.some((e) => e.pack.city === theme.id && rulesIn(e.level.bottles).some((r) => r.rule === rule));
    if (known.includes(key) || metHere) return [];
    const metBefore =
      known.some((k) => k.startsWith('rule:') && k.endsWith(`:${rule}`)) ||
      won.some((e) => rulesIn(e.level.bottles).some((r) => r.rule === rule));
    const look = LOOKS[theme.blockers[rule]] ?? 'a sign';
    const first = bottles[glasses[0]!]!;
    const how =
      rule === 'locked'
        ? `Fill a glass with ${drink(first.lockedUntil)} to open it.`
        : rule === 'only'
          ? `It only takes ${drink(first.only)}.`
          : 'Each one shows when it reaches the top.';
    const what =
      rule === 'locked'
        ? `This glass is shut with ${look}.`
        : rule === 'only'
          ? `This glass has ${look}.`
          : `Some drinks are hidden under ${look}.`;
    const text = metBefore ? `Same rule, new look: ${look}. ${how}` : `${what} ${how}`;
    return [{ rule, key, title: TITLES[rule], text, glasses }];
  });
}
