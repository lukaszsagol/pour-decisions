import { describe, expect, it } from 'vitest';
import { getTheme } from '@pour/themes';
import { Progress, SAVE_KEY, type KeyValueStore } from '../src/economy/save.js';
import { rulesToIntroduce } from '../src/rules-intro.js';

const store = (save: unknown): KeyValueStore => {
  const m = new Map<string, string>([[SAVE_KEY, JSON.stringify(save)]]);
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};
const fresh = () =>
  new Progress(store({ version: 2, levels: {}, current: 1, intro: { welcomed: true, announced: [], opened: [] } }));
const unit = (drink: string, hidden = false) => ({ drink, hidden });

describe('the bartender introduces special glasses', () => {
  it("explains hidden drinks in the city's own look", () => {
    const london = getTheme('london');
    const d = london.drinks[0]!.id;
    const [intro] = rulesToIntroduce(fresh(), london, [
      { capacity: 4, units: [unit(d, true), unit(d)] },
      { capacity: 4, units: [] },
    ]);
    expect(intro).toMatchObject({ rule: 'hidden', key: 'rule:london:hidden', title: 'Hidden drinks', glasses: [0] });
    expect(intro!.text).toBe('Some drinks are hidden under a pewter tankard. Each one shows when it reaches the top.');
  });

  it('names the drink an only-glass takes, and says it once per city', () => {
    const ny = getTheme('newyork');
    const drink = ny.drinks[1]!;
    const p = fresh();
    const level = [{ capacity: 4, units: [], only: drink.id }];
    expect(rulesToIntroduce(p, ny, level)[0]!.text).toBe(`This glass has a velvet rope. It only takes ${drink.name}.`);
    p.markIntro('announced', 'rule:newyork:only');
    expect(rulesToIntroduce(p, ny, level)).toEqual([]);
    // Known from New York, new in Tokyo: the short version.
    const tokyo = getTheme('tokyo');
    expect(rulesToIntroduce(p, tokyo, [{ capacity: 4, units: [], only: tokyo.drinks[0]!.id }])[0]!.text).toMatch(
      /^Same rule, new look: a bottle-keep tag\. It only takes /,
    );
  });
});
