import './style.css';
import { watchInstall } from './install.js';

watchInstall();
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
import { TrainingScreen } from './training/screen.js';
import { family } from './family/index.js';
import { avatar, FamilyScreen } from './family/screen.js';
import { modes, nextRating, planningScore, trainingLevel, type TrainingMode } from './training/logic.js';
import { session } from './session.js';
import { createStage } from './stage.js';
import { playLog, progress } from './state.js';
import './debug.js';
import { sfx } from './sound.js';

interface Screen {
  mount(): Promise<void>;
  destroy(): void;
}

const tabs: Record<Tab, string> = { map: '#/map', daily: '#/daily', passport: '#/passport', family: '#/family' };

sfx.setMuted(progress.data.settings.muted);
progress.onChange(() => sfx.setMuted(progress.data.settings.muted));

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
    onWin: (result: LevelResult) => {
      const lastOfBar = pack.levels[pack.levels.length - 1]!.number === level.number;
      const rewards = progress.recordWin({
        number: result.number,
        stars: result.stars,
        moves: result.moves,
        firstTry: result.restarts === 0,
        lastOfBar,
      });
      void family()?.pushProgress(progress.data.current, progress.totalStars(), progress.totalStars());
      const recipe = lastOfBar ? recipeFor(theme.id, pack.bar) : undefined;
      session.complete = {
        theme,
        result,
        difficulty: level.difficulty,
        rewards,
        ...(recipe ? { recipe: { recipe, index: (theme.order - 1) * 5 + pack.bar, total: 20 } } : {}),
        ...(family() ? { family: familyRow(level.number, result.moves) } : {}),
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
      void family()?.pushDaily(date, result.stars, result.moves);
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

function trainingScreen(mode: TrainingMode): Screen {
  const theme = themeForLevel(progress.data.current);
  const rating = progress.data.training.rating;
  const t0 = Date.now();
  const level = trainingLevel(
    mode,
    theme,
    rating,
    `training-${mode}-${progress.data.training.sessions.length}-${dateKey()}`,
  );
  const m = modes[mode];
  let startedAt = t0 + (m.peekMs ?? 0);
  let recorded = false;
  const record = (won: boolean, moves: number) => {
    if (recorded) return null;
    recorded = true;
    const score = planningScore(won, moves, level.best);
    const msPerPour = moves ? Math.round((Date.now() - startedAt) / moves) : 0;
    const next = nextRating(rating, won, score);
    progress.recordTraining({ mode, t: Date.now(), won, score, moves, best: level.best, msPerPour, rating: next });
    return { score, msPerPour, next };
  };
  return new LevelScreen(stage, {
    theme,
    number: 0,
    barName: m.title,
    subtitle: `Training · level ${rating} of 6`,
    bottles: level.bottles,
    best: level.best,
    stock: { ...progress.data.stock },
    boosters: m.boosters,
    ...(m.peekMs ? { peekMs: m.peekMs } : {}),
    backHref: '#/training',
    nextHref: '#/complete',
    nextLabel: 'See your score',
    onStock: (stock) => progress.setStock(stock),
    onEvent: (e) => {
      playLog.add(`training-${mode}`, e);
      if (e.type === 'restart') startedAt = Date.now();
      if (e.type === 'quit' && typeof e.moves === 'number') record(false, e.moves);
    },
    onWin: (result) => {
      const r = record(true, result.moves)!;
      session.complete = {
        theme,
        result,
        difficulty: 'normal',
        kicker: `${m.title} training`,
        verdict: `Planning score ${r.score}`,
        subline: `${result.moves} moves · best ${level.best} · ${(r.msPerPour / 1000).toFixed(1)} s per pour`,
        share: `Pour Decisions · ${m.title} training · planning score ${r.score}`,
        nextHref: '#/training',
        nextLabel: r.next > rating ? 'Next: a harder one' : 'Back to training',
      };
    },
  });
}

async function familyMembers() {
  const g = await family()!.group();
  const me = family()!.me();
  return (g?.members ?? []).map((m) => ({ name: m.name, color: m.color, current: m.current, me: m.id === me }));
}

async function familyDailyLine(): Promise<string | null> {
  const g = await family()!.group();
  if (!g) return null;
  const results = await family()!.daily(dateKey());
  const byId = new Map(g.members.map((m) => [m.id, m]));
  const played = results.map((r) => byId.get(r.memberId)).filter((m) => m !== undefined);
  return `${played.map((m) => avatar(m)).join('')} ${played.length} of ${g.members.length} have played`;
}

async function familyRow(level: number, moves: number): Promise<string | null> {
  const g = await family()!.group();
  if (!g) return null;
  const results = await family()!.levelResults(level);
  if (results.length === 0) return null;
  const byId = new Map(g.members.map((m) => [m.id, m]));
  const best = results.reduce((a, b) => (b.moves < a.moves ? b : a));
  const who = byId.get(best.memberId)!;
  const verdict =
    moves < best.moves
      ? `Beat ${who.name}`
      : moves === best.moves
        ? `Tied ${who.name}`
        : `${who.name} did it in ${best.moves}`;
  return `${results.map((r) => avatar(byId.get(r.memberId)!)).join('')} <span>${verdict} for family best</span>`;
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
      ...(family() ? { members: familyMembers() } : {}),
      backHref: '#/passport',
      footer: tabBar('map', tabs),
    });
  }
  if (name === 'daily') return dailyScreen();
  if (name === 'training') return new TrainingScreen(stage, themeForLevel(progress.data.current), progress);
  if (name === 'train' && arg && arg in modes) return trainingScreen(arg as TrainingMode);
  if (name === 'family') {
    const backend = family();
    const theme = themeForLevel(progress.data.current);
    return backend ? new FamilyScreen(stage, theme, tabs, backend) : new FamilyPlaceholder(stage, theme, tabs);
  }
  if (name === '' || name === 'passport') {
    const today = progress.data.daily[dateKey()];
    const dailyLine = today
      ? `${'★'.repeat(today.stars)}${'☆'.repeat(3 - today.stars)} ${today.moves} moves tonight (best ${today.best})`
      : 'A new level every night';
    return new PassportScreen(stage, {
      progress,
      tabs,
      dailyHref: '#/daily',
      dailyLine,
      ...(family() ? { dailyFamily: familyDailyLine() } : {}),
    });
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
