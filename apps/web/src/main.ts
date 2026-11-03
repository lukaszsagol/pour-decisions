import './style.css';
import { getTheme, themeForLevel } from '@pour/themes';
import { designFixtures } from './fixtures.js';
import { LevelScreen } from './level/screen.js';
import { getLevel } from './levels.js';
import { createStage } from './stage.js';

interface Screen {
  mount(): Promise<void>;
  destroy(): void;
}

const stage = createStage(document.getElementById('app')!);
let current: Screen | null = null;

const defaultStock = () => ({ undo: 5, extraGlass: 2, hint: 3 });

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
  const number = name === 'level' ? Number(arg) : 1;
  const entry = getLevel(number) ?? getLevel(1)!;
  const theme = themeForLevel(entry.level.number);
  return new LevelScreen(stage, {
    theme,
    number: entry.level.number,
    barName: entry.pack.name,
    bottles: entry.level.bottles,
    best: entry.level.best,
    stock: defaultStock(),
    backHref: '#/',
    guide: entry.level.number === 1,
    nextHref: getLevel(entry.level.number + 1) ? `#/level/${entry.level.number + 1}` : '#/',
  });
}

async function show(): Promise<void> {
  current?.destroy();
  current = route();
  await current.mount();
}

window.addEventListener('hashchange', () => void show());
void show();
