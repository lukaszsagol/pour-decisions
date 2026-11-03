import './style.css';
import { getTheme, recipeFor, themeForLevel } from '@pour/themes';
import { CompleteScreen } from './complete/screen.js';
import { rewardsFor } from './economy/rewards.js';
import { designFixtures } from './fixtures.js';
import { LevelScreen, type LevelResult } from './level/screen.js';
import { getLevel } from './levels.js';
import { session } from './session.js';
import { createStage } from './stage.js';

interface Screen {
  mount(): Promise<void>;
  destroy(): void;
}

const stage = createStage(document.getElementById('app')!);
let current: Screen | null = null;

const defaultStock = () => ({ undo: 5, extraGlass: 2, hint: 3 });
let streak = 0;

function levelScreen(number: number): Screen {
  const entry = getLevel(number) ?? getLevel(1)!;
  const { level, pack } = entry;
  const theme = themeForLevel(level.number);
  const next = getLevel(level.number + 1);
  return new LevelScreen(stage, {
    theme,
    number: level.number,
    barName: pack.name,
    bottles: level.bottles,
    best: level.best,
    stock: defaultStock(),
    backHref: '#/',
    guide: level.number === 1,
    nextHref: '#/complete',
    nextLabel: 'Collect rewards',
    onWin: (result: LevelResult) => {
      const rewards = rewardsFor({
        stars: result.stars,
        difficulty: level.difficulty,
        previousStars: 0,
        firstTry: result.restarts === 0,
        streakBefore: streak,
      });
      streak = rewards.streak;
      const lastOfBar = pack.levels[pack.levels.length - 1]!.number === level.number;
      const recipe = lastOfBar ? recipeFor(theme.id, pack.bar) : undefined;
      session.complete = {
        theme,
        result,
        difficulty: level.difficulty,
        rewards,
        ...(recipe ? { recipe: { recipe, index: (theme.order - 1) * 5 + pack.bar, total: 20 } } : {}),
        nextHref: next ? `#/level/${next.level.number}` : '#/',
        nextLabel: 'Next level',
      };
    },
  });
}

function route(): Screen {
  const hash = location.hash.replace(/^#\/?/, '');
  const [name, arg] = hash.split('/');
  if (name === 'fixture' && arg && designFixtures[arg]) {
    const f = designFixtures[arg]!;
    const screen = new LevelScreen(stage, {
      theme: getTheme(f.city),
      number: f.number,
      barName: f.barName,
      bottles: f.bottles,
      best: f.best,
      stock: f.stock,
      backHref: '#/',
      nextHref: '#/',
    });
    screen.game.moves = f.moves;
    screen.game.selected = f.selected;
    return screen;
  }
  if (name === 'complete' && session.complete) return new CompleteScreen(stage, session.complete);
  return levelScreen(name === 'level' ? Number(arg) : 1);
}

async function show(): Promise<void> {
  current?.destroy();
  current = route();
  await current.mount();
}

window.addEventListener('hashchange', () => void show());
void show();
