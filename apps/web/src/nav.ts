import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/** What a route's parent depends on. */
export interface NavContext {
  /** The city map a level belongs to, e.g. `#/map/london`. */
  mapOfLevel(number: number): string;
  /** The level a bare `#/level` opens. */
  currentLevel: number;
  /** Where the complete screen's main button goes (the map, the daily pour or training). */
  completeNext: string | null;
}

/**
 * The screen "back" leads to from a route: levels go to their city map, everything else to the
 * passport (or to the screen that opened it). The passport is the root: null.
 */
export function parentOf(hash: string, ctx: NavContext): string | null {
  const [name = '', arg] = hash.replace(/^#\/?/, '').split('/');
  switch (name) {
    case '':
    case 'passport':
      return null;
    case 'daily':
      return arg === 'play' ? '#/daily' : '#/passport';
    case 'map':
    case 'book':
    case 'training':
    case 'family':
      return '#/passport';
    case 'train':
      return '#/training';
    case 'complete':
      return ctx.completeNext ?? '#/passport';
    case 'fixture':
      return '#/';
    case 'level':
      return ctx.mapOfLevel(Number(arg) || ctx.currentLevel);
    default:
      return ctx.mapOfLevel(ctx.currentLevel);
  }
}

/**
 * Routes that name the same screen compare equal: `#/`, `#` and `#/passport`, and `#/map` (the
 * Map tab) with the current city's map.
 */
function same(a: string, b: string, ctx: NavContext): boolean {
  const canon = (h: string) => {
    const r = h.replace(/^#\/?/, '') || 'passport';
    return r === 'map' ? ctx.mapOfLevel(ctx.currentLevel).replace(/^#\/?/, '') : r;
  };
  return canon(a) === canon(b);
}

/**
 * Going up to a parent screen. When the parent is the history entry just before this one, it
 * steps back to it, so the history doesn't grow; otherwise it replaces this entry. Either way
 * the screen being left is gone from the history, and the back gesture can't reopen it (before,
 * a back arrow pushed the map after the level, and the gesture then went back into the level).
 * Each entry remembers the route before it in `history.state.prev`.
 */
let last = '';
let carry: string | null | undefined;

function goUp(parent: string, ctx: NavContext): void {
  const prev = (history.state as { prev?: string | null } | null)?.prev;
  if (prev != null && same(prev, parent, ctx)) return history.back();
  carry = prev ?? null;
  location.replace(parent);
}

/**
 * Links marked `data-up` (the back arrows) go up instead of pushing a new entry; Android's back
 * button or gesture closes an open sheet, else goes up, and leaves the app from the passport.
 */
export function installBackNavigation(ctx: () => NavContext): void {
  last = location.hash;
  if (!(history.state as { nav?: number } | null)?.nav) history.replaceState({ nav: 1, prev: null }, '');
  window.addEventListener('hashchange', () => {
    // A new entry (link or replace) learns its previous route; entries reached by back or
    // forward already know theirs.
    if (!(history.state as { nav?: number } | null)?.nav)
      history.replaceState({ nav: 1, prev: carry !== undefined ? carry : last }, '');
    carry = undefined;
    last = location.hash;
  });
  document.addEventListener('click', (e) => {
    const link = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[data-up]');
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    goUp(link.getAttribute('href')!, ctx());
  });
  if (Capacitor.getPlatform() !== 'android') return;
  void App.addListener('backButton', () => {
    const sheet = document.querySelector('.sheet-backdrop');
    if (sheet) return sheet.remove();
    const c = ctx();
    const parent = parentOf(location.hash, c);
    if (parent === null) void App.exitApp();
    else goUp(parent, c);
  });
}
