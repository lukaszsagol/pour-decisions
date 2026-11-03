import { esc, icons } from './icons.js';

export type Tab = 'map' | 'daily' | 'passport' | 'family';

const labels: Record<Tab, string> = { map: 'Map', daily: 'Daily', passport: 'Passport', family: 'Family' };

/** Bottom tab bar shown on the Passport and City map screens. */
export function tabBar(active: Tab, hrefs: Record<Tab, string>): string {
  const item = (t: Tab) => `
    <a class="tab${t === active ? ' is-active' : ''}" href="${esc(hrefs[t])}"${t === active ? ' aria-current="page"' : ''}>
      <span class="tab-icon">${icons.tab(t, 'currentColor')}</span>
      <span>${labels[t]}</span>
    </a>`;
  return `<nav class="tabbar" aria-label="Main">${(['map', 'daily', 'passport', 'family'] as Tab[]).map(item).join('')}</nav>`;
}
