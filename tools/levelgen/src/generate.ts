import {
  analyse,
  createRng,
  deal,
  difficulty,
  solvableForEveryReveal,
  solveBestFirst,
  validateLevel,
  type Bottle,
  type LevelPack,
  type PackLevel,
  type Rng,
} from '@pour/engine';
import { drinksFor, getTheme, type CityId } from '@pour/themes';
import { cityRules, type BlockerKind } from './cities.js';
import { barPlan, difficultyOf, LEVELS_PER_BAR, type SlotKind } from './curve.js';
import { goldenLevels } from './golden.js';

/** Global number of a bar's first level. */
export function firstLevel(city: CityId, bar: number): number {
  return getTheme(city).levels[0] + (bar - 1) * LEVELS_PER_BAR;
}

/** How many drinks a level uses: added gradually from 2 at level 1 up to 10. */
export function drinkCount(level: number, kind: SlotKind): number {
  const base =
    level <= 2
      ? 2
      : level <= 5
        ? 3
        : level <= 12
          ? 4
          : level <= 25
            ? 5
            : level <= 50
              ? 6
              : level <= 100
                ? 7
                : level <= 180
                  ? 8
                  : 9;
  switch (kind) {
    case 'teach':
      return Math.min(base, 4);
    case 'relief':
      return Math.max(2, base - 1);
    case 'hard':
      return Math.min(10, base + (level <= 40 ? 0 : 1));
    case 'superHard':
      return Math.min(10, base + 1);
    default:
      return base;
  }
}

/** Target difficulty score (0–100) for a level: a slow climb, with the sawtooth on top. */
export function targetScore(level: number, kind: SlotKind): number {
  const base = 4 + 36 * Math.min(1, level / 400) ** 0.75;
  const offset = { normal: 0, relief: -6, hard: 12, superHard: 22, teach: -10 }[kind];
  // The first 40 levels stay gentle whatever their slot.
  const gentle = level <= 40 ? 0.5 : 1;
  return Math.max(0, base + offset * gentle);
}

/** Blockers a level may use: the city's, once they have been taught. */
export function availableBlockers(city: CityId, level: number): BlockerKind[] {
  const rules = cityRules[city];
  return rules.blockers.filter((b) => !(rules.introduces?.blocker === b && level < rules.introduces.level));
}

interface Recipe {
  drinks: number;
  empties: number;
  maxRun: number;
  blockers: BlockerKind[];
  /** Blockers stay easy (an extra locked glass rather than locking a spare one). */
  gentle: boolean;
}

function recipeFor(city: CityId, level: number, kind: SlotKind, rng: Rng): Recipe {
  const drinks = drinkCount(level, kind);
  const recipe: Recipe = {
    drinks,
    empties: drinks === 2 ? 1 : 2,
    maxRun: level <= 2 ? 3 : 2,
    blockers: [],
    gentle: true,
  };
  const intro = cityRules[city].introduces;
  if (intro && level === intro.level) return { ...recipe, blockers: [intro.blocker] };
  const pool = availableBlockers(city, level);
  if (pool.length === 0 || kind === 'relief') return recipe;
  const chance = { normal: 0.35, hard: 0.75, superHard: 1, teach: 1, relief: 0 }[kind];
  if (rng.next() < chance) recipe.blockers.push(rng.pick(pool));
  if (kind === 'superHard' && pool.length > 1 && rng.next() < 0.5) {
    const second = rng.pick(pool.filter((b) => b !== recipe.blockers[0]));
    recipe.blockers.push(second);
  }
  recipe.gentle = level <= 40 || kind === 'normal';
  return recipe;
}

/** Adds one blocker to dealt bottles. Returns false when it cannot be placed. */
function addBlocker(bottles: Bottle[], kind: BlockerKind, drinks: string[], rng: Rng, gentle: boolean): boolean {
  const capacity = bottles[0]!.capacity;
  const empties = bottles
    .map((b, i) => (b.units.length === 0 && !b.only && !b.lockedUntil ? i : -1))
    .filter((i) => i >= 0);
  switch (kind) {
    case 'locked': {
      // Gentle: an extra glass chained shut. Otherwise lock a spare glass or a full one.
      const mode = gentle ? 'extra' : rng.pick(['extra', 'spare', 'full'] as const);
      if (mode === 'extra') {
        bottles.push({ capacity, units: [], lockedUntil: rng.pick(drinks) });
        return true;
      }
      if (mode === 'spare' && empties.length > 1) {
        bottles[empties[0]!]!.lockedUntil = rng.pick(drinks);
        return true;
      }
      const full = bottles.map((b, i) => (b.units.length > 0 && !b.lockedUntil ? i : -1)).filter((i) => i >= 0);
      if (full.length === 0) return false;
      const target = bottles[rng.pick(full)]!;
      const outside = drinks.filter((d) => !target.units.some((u) => u.drink === d));
      if (outside.length === 0) return false;
      target.lockedUntil = rng.pick(outside);
      return true;
    }
    case 'hidden': {
      const slots: [number, number][] = [];
      bottles.forEach((b, i) => b.units.forEach((u, j) => j < b.units.length - 1 && !u.hidden && slots.push([i, j])));
      const count = Math.min(slots.length, gentle ? 2 : 2 + rng.int(3));
      for (const [i, j] of rng.shuffle(slots).slice(0, count)) bottles[i]!.units[j]!.hidden = true;
      return count > 0;
    }
    case 'only': {
      // Gentle: an extra glass that only takes one drink. Otherwise a spare glass becomes one.
      if (!gentle && empties.length > 1 && rng.next() < 0.5) bottles[empties[0]!]!.only = rng.pick(drinks);
      else bottles.push({ capacity, units: [], only: rng.pick(drinks) });
      return true;
    }
  }
}

interface Candidate {
  level: PackLevel;
  score: number;
}

function candidate(city: CityId, number: number, kind: SlotKind, k: number): Candidate | null {
  const seed = `${city}-${number}-${k}`;
  const rng = createRng(`${seed}-recipe`);
  const recipe = recipeFor(city, number, kind, rng);
  const drinks = drinksFor(getTheme(city), recipe.drinks).map((d) => d.id);
  let bottles: Bottle[];
  try {
    bottles = deal({ drinks, empties: recipe.empties, seed, constraints: { maxRun: recipe.maxRun } });
  } catch {
    return null;
  }
  for (const b of recipe.blockers) if (!addBlocker(bottles, b, drinks, rng, recipe.gentle)) return null;
  if (validateLevel(bottles).length > 0) return null;
  // Cheap reject before the full analysis.
  const quick = solveBestFirst(bottles, { maxNodes: 30_000 });
  if (!quick.solvable && quick.exhaustive) return null;
  if (
    recipe.blockers.includes('hidden') &&
    !solvableForEveryReveal(bottles, { bfsNodes: 40_000, fallbackNodes: 80_000 })
  )
    return null;
  const analysis = analyse(bottles);
  if (!analysis.solvable) return null;
  const d = difficulty(bottles, { analysis, runs: 120, seed });
  return {
    score: d.score,
    level: {
      id: `${city}-${number}`,
      number,
      difficulty: difficultyOf(kind),
      best: analysis.best,
      seed,
      bottles,
      metrics: {
        score: d.score,
        botWinRate: round(d.botWinRate),
        branching: round(analysis.branching),
        deadEndShare: round(analysis.deadEndShare),
        firstMoves: analysis.firstMoves,
        winningFirstMoves: analysis.winningFirstMoves,
        emptyPours: analysis.emptyPours,
        optimal: analysis.optimal ? 1 : 0,
      },
      solution: analysis.solution.map((m) => [m.from, m.to]),
    },
  };
}

const round = (x: number) => Math.round(x * 1000) / 1000;

/**
 * Generates one level: deals several seeded candidates, keeps the solvable
 * ones and picks the one closest to the slot's target difficulty.
 */
export function generateLevel(city: CityId, number: number, kind: SlotKind, candidates = 6): PackLevel {
  const golden = goldenLevels[number];
  if (golden && golden.city === city) return golden.build();
  const target = targetScore(number, kind);
  const found: Candidate[] = [];
  for (let k = 0; k < 60 && found.length < candidates; k++) {
    const c = candidate(city, number, kind, k);
    if (!c) continue;
    // The first levels must not punish: skip deals where many first pours already lose.
    if (number <= 40 && c.level.metrics.deadEndShare > 0.25) continue;
    found.push(c);
  }
  if (found.length === 0) throw new Error(`No solvable level found for ${city} ${number}`);
  // Level 1 must be obvious: the shortest solution wins.
  if (number === 1) return found.sort((a, b) => a.level.best - b.level.best)[0]!.level;
  return found.sort((a, b) => Math.abs(a.score - target) - Math.abs(b.score - target))[0]!.level;
}

/** Generates a whole bar (20 levels) as a level pack. */
export function generateBar(
  city: CityId,
  bar: number,
  onLevel?: (level: PackLevel, kind: SlotKind) => void,
): LevelPack {
  const theme = getTheme(city);
  const plan = barPlan(city, bar);
  const start = firstLevel(city, bar);
  const intro = cityRules[city].introduces;
  const levels = plan.map((kind, i) => {
    const number = start + i;
    const slot: SlotKind = intro && number === intro.level ? 'teach' : kind;
    const level = generateLevel(city, number, slot);
    onLevel?.(level, slot);
    return level;
  });
  return { city, bar, name: theme.bars[bar - 1]!, levels };
}
