import { describe, expect, it } from 'vitest';
import { deltaEHex, drinksFor, getTheme, hexToLab, themeForLevel, themes, validateTheme } from '../src/index.js';

describe('theme files', () => {
  it('load and validate in play order', () => {
    expect(themes.map((t) => t.id)).toEqual(['amsterdam', 'london', 'newyork', 'tokyo']);
  });

  it('cover levels 1 to 400 without gaps', () => {
    expect(themeForLevel(1).id).toBe('amsterdam');
    expect(themeForLevel(100).id).toBe('amsterdam');
    expect(themeForLevel(101).id).toBe('london');
    expect(themeForLevel(327).id).toBe('tokyo');
    expect(() => themeForLevel(401)).toThrow();
  });

  it('have five bars and at least ten drinks each', () => {
    for (const t of themes) {
      expect(t.bars).toHaveLength(5);
      expect(t.drinks.length).toBeGreaterThanOrEqual(10);
    }
  });

  it('keep the designed drinks', () => {
    expect(drinksFor(getTheme('amsterdam'), 5).map((d) => d.id)).toEqual([
      'jenever',
      'advocaat',
      'cherry',
      'oranjebitter',
      'curacao',
    ]);
    expect(new Set(drinksFor(getTheme('tokyo'), 5).map((d) => d.id))).toEqual(
      new Set(['umeshu', 'sakura', 'melon', 'yuzu', 'ramune']),
    );
  });
});

describe('validator', () => {
  it('reports problems', () => {
    expect(validateTheme(null)).toEqual(['Theme must be an object']);
    const broken = { ...getTheme('tokyo'), colors: { ...getTheme('tokyo').colors, accent: 'pink' }, drinks: [] };
    const errors = validateTheme(broken);
    expect(errors).toContain('Colour accent must be #rrggbb');
    expect(errors).toContain('drinks must be a non-empty list');
  });
});

describe('colour maths', () => {
  it('matches CIEDE2000 reference pairs (Sharma et al.)', () => {
    const lab = (L: number, a: number, b: number) => ({ L, a, b });
    const pairs: [ReturnType<typeof lab>, ReturnType<typeof lab>, number][] = [
      [lab(50, 2.6772, -79.7751), lab(50, 0, -82.7485), 2.0425],
      [lab(50, -1.3802, -84.2814), lab(50, 0, -82.7485), 1.0],
      [lab(50, 2.5, 0), lab(73, 25, -18), 27.1492],
      [lab(60.2574, -34.0099, 36.2677), lab(60.4626, -34.1751, 39.4387), 1.2644],
    ];
    return import('../src/color.js').then(({ deltaE2000 }) => {
      for (const [a, b, want] of pairs) expect(deltaE2000(a, b)).toBeCloseTo(want, 3);
    });
  });

  it('converts sRGB to Lab', () => {
    expect(hexToLab('#ffffff').L).toBeCloseTo(100, 1);
    expect(hexToLab('#000000').L).toBeCloseTo(0, 1);
  });
});

describe('drink palettes', () => {
  for (const t of themes) {
    it(`${t.name}: every pair of drinks differs by ΔE2000 ≥ 20`, () => {
      const bad: string[] = [];
      for (let i = 0; i < t.drinks.length; i++)
        for (let j = i + 1; j < t.drinks.length; j++) {
          const e = deltaEHex(t.drinks[i]!.color, t.drinks[j]!.color);
          if (e < 20) bad.push(`${t.drinks[i]!.id}/${t.drinks[j]!.id} ${e.toFixed(1)}`);
        }
      expect(bad).toEqual([]);
    });

    it(`${t.name}: neighbours in the list differ by at least 8 L*`, () => {
      const bad: string[] = [];
      for (let i = 0; i + 1 < t.drinks.length; i++) {
        const d = Math.abs(hexToLab(t.drinks[i]!.color).L - hexToLab(t.drinks[i + 1]!.color).L);
        if (d < 8) bad.push(`${t.drinks[i]!.id}/${t.drinks[i + 1]!.id} ${d.toFixed(1)}`);
      }
      expect(bad).toEqual([]);
    });
  }
});

describe('recipes', () => {
  it('every city has a valid recipe for each of its five bars (20 cards)', async () => {
    const { cityIds, recipesFor, validateRecipes } = await import('../src/index.js');
    for (const city of cityIds) {
      const recipes = recipesFor(city);
      expect(
        recipes.map((r) => r.bar),
        city,
      ).toEqual([1, 2, 3, 4, 5]);
      expect(validateRecipes({ city, recipes }), city).toEqual([]);
    }
  });
});
