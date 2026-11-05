import { esc, icons } from './icons.js';
import { isNew, isOpen, OPENS_WHEN, type Feature } from './onboarding.js';
import { progress } from './state.js';

export type Tab = 'map' | 'daily' | 'passport' | 'book';

const labels: Record<Tab, string> = { map: 'Map', daily: 'Daily', passport: 'Passport', book: 'Recipes' };

/** Tabs that open with progress (see onboarding.ts); Map and Passport are always there. */
const gated: Partial<Record<Tab, Feature>> = { daily: 'daily', book: 'book' };

/**
 * Bottom tab bar shown on the Passport, City map, Daily and Cocktail book screens. A tab whose
 * feature hasn't opened yet is dimmed with a lock and says when it opens; one that opened but
 * hasn't been visited shows NEW.
 */
export function tabBar(active: Tab, hrefs: Record<Tab, string>): string {
  explainLockedTabs();
  const item = (t: Tab) => {
    const icon = `<span class="tab-icon">${icons.tab(t, 'currentColor')}</span>`;
    const feature = gated[t];
    if (feature && !isOpen(progress, feature))
      return `
    <button class="tab is-locked" type="button" data-opens="${esc(OPENS_WHEN[feature])}" aria-label="${labels[t]}, opens ${esc(OPENS_WHEN[feature])}">
      ${icon}<span>${labels[t]}</span><span class="tab-lock" aria-hidden="true">${icons.lock('currentColor')}</span>
    </button>`;
    const fresh = feature && t !== active && isNew(progress, feature);
    return `
    <a class="tab${t === active ? ' is-active' : ''}" href="${esc(hrefs[t])}"${t === active ? ' aria-current="page"' : ''}>
      ${icon}<span>${labels[t]}</span>${fresh ? '<span class="tab-new">New</span>' : ''}
    </a>`;
  };
  return `<nav class="tabbar" aria-label="Main">${(['map', 'daily', 'passport', 'book'] as Tab[]).map(item).join('')}</nav>`;
}

let explaining = false;

/** A locked tab says when it opens, in a short note above the bar. Set up once. */
function explainLockedTabs(): void {
  if (explaining) return;
  explaining = true;
  document.addEventListener('click', onLockedTab);
}

function onLockedTab(e: MouseEvent): void {
  const tab = (e.target as Element | null)?.closest<HTMLElement>('.tab.is-locked');
  if (!tab) return;
  const bar = tab.closest('.tabbar');
  bar?.parentElement?.querySelector('.tab-note')?.remove();
  const note = document.createElement('div');
  note.className = 'tab-note';
  note.setAttribute('role', 'status');
  note.textContent = `${tab.querySelector('span:not(.tab-icon):not(.tab-lock)')?.textContent ?? ''} opens ${tab.dataset.opens}.`;
  bar?.insertAdjacentElement('beforebegin', note);
  setTimeout(() => note.remove(), 2600);
}
