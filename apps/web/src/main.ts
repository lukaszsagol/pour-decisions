import './style.css';
import { cityIds, getTheme, recipeFor, themeForLevel, type CityId } from '@pour/themes';
import { CompleteScreen } from './complete/screen.js';
import { designFixtures } from './fixtures.js';
import { LevelScreen, type LevelResult } from './level/screen.js';
import { getLevel, levelsInCity } from './levels.js';
import { MapScreen } from './map/screen.js';
import { FamilyPlaceholder } from './family/placeholder.js';
import { PassportScreen } from './passport/screen.js';
import { tabBar, type Tab } from './tabbar.js';
import { dailyLevel, dailyShareText, dateKey } from './daily/generate.js';
import { session } from './session.js';
import { createStage } from './stage.js';
import { playLog, progress } from './state.js';
import './debug.js';
import { economy } from './economy/config.js';

interface Screen {
  mount(): Promise<void>;
  destroy(): void;
}

const tabs: Record<Tab, string> = { map: '#/map', daily: '#/daily', passport: '#/passport', family: '#/family' };

const stage = createStage(document.getElementById('app')!);
let current: Screen | null = null;

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
    stock: { ...progress.data.stock },
    backHref: `#/map/${theme.id}`,
    guide: level.number === 1,
    nextHref: '#/complete',
    nextLabel: 'Collect rewards',
    onStock: (stock) => progress.setStock(stock),
    onEvent: (e) => {
      playLog.add(level.number, e);
      if (e.type === 'restart' || e.type === 'quit') progress.recordFail();
    },
    continueOffer: {
      price: economy.deadEndContinue,
      canBuy: () => progress.data.coins >= economy.deadEndContinue,
      buy: () => progress.buyBooster('extraGlass', economy.deadEndContinue),
    },
    onWin: (result: LevelResult) => {
      const rewards = progress.recordWin({
        number: result.number,
        stars: result.stars,
        moves: result.moves,
        difficulty: level.difficulty,
        firstTry: result.restarts === 0,
      });
      const lastOfBar = pack.levels[pack.levels.length - 1]!.number === level.number;
      const recipe = lastOfBar ? recipeFor(theme.id, pack.bar) : undefined;
      session.complete = {
        theme,
        result,
        difficulty: level.difficulty,
        rewards,
        ...(recipe ? { recipe: { recipe, index: (theme.order - 1) * 5 + pack.bar, total: 20 } } : {}),
        nextHref: next ? `#/map/${themeForLevel(next.level.number).id}` : `#/map/${theme.id}`,
        nextLabel: 'Next level',
      };
    },
  });
}

function dailyScreen(): Screen {
  const date = dateKey();
  const d = dailyLevel(date);
  return new LevelScreen(stage, {
    theme: d.theme,
    number: 0,
    barName: "Tonight's pour",
    subtitle: `${d.theme.name} · ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`,
    bottles: d.bottles,
    best: d.best,
    stock: { ...progress.data.stock },
    backHref: '#/passport',
    nextHref: '#/complete',
    nextLabel: 'Collect rewards',
    onStock: (stock) => progress.setStock(stock),
    onEvent: (e) => playLog.add(`daily-${date}`, e),
    onWin: (result) => {
      const rewards = progress.recordDaily(date, result.stars, result.moves, d.best);
      session.complete = {
        theme: d.theme,
        result,
        difficulty: 'normal',
        rewards,
        kicker: "Tonight's pour cleared",
        share: dailyShareText(date, result.stars, result.moves, d.best),
        nextHref: '#/passport',
        nextLabel: 'Back to the passport',
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
  if (name === 'map') {
    const city = cityIds.includes(arg as CityId) ? (arg as CityId) : themeForLevel(progress.data.current).id;
    return new MapScreen(stage, {
      theme: getTheme(city),
      levels: levelsInCity(city),
      progress,
      backHref: '#/passport',
      footer: tabBar('map', tabs),
    });
  }
  if (name === 'daily') return dailyScreen();
  if (name === 'family') return new FamilyPlaceholder(stage, themeForLevel(progress.data.current), tabs);
  if (name === '' || name === 'passport') {
    const today = progress.data.daily[dateKey()];
    const dailyLine = today
      ? `${'★'.repeat(today.stars)}${'☆'.repeat(3 - today.stars)} ${today.moves} moves tonight (best ${today.best})`
      : 'A new level every night';
    return new PassportScreen(stage, { progress, tabs, dailyHref: '#/daily', dailyLine });
  }
  return levelScreen(name === 'level' ? Number(arg) : progress.data.current);
}

async function show(): Promise<void> {
  current?.destroy();
  current = route();
  await current.mount();
}

window.addEventListener('hashchange', () => void show());
void show();

// Offline play: the service worker exists only in production builds.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('./sw.js').catch(() => undefined));
}
