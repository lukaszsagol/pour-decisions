import { esc } from './icons.js';

export type Tab = 'map' | 'daily' | 'passport' | 'family';

const tabIcons: Record<Tab, string> = {
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  daily:
    '<rect x="4" y="5" width="16" height="15" rx="2.5" stroke="currentColor" stroke-width="1.8"/><path d="M4 10h16M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  passport:
    '<rect x="5" y="3" width="14" height="18" rx="2.5" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="1.8"/><path d="M9 16h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  family:
    '<circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.8"/><circle cx="17" cy="9" r="2.4" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M14.5 15.2A4.5 4.5 0 0 1 21 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
};

const labels: Record<Tab, string> = { map: 'Map', daily: 'Daily', passport: 'Passport', family: 'Family' };

/** Bottom tab bar shown on the Passport and City map screens. */
export function tabBar(active: Tab, hrefs: Record<Tab, string>): string {
  const item = (t: Tab) => `
    <a class="tab${t === active ? ' is-active' : ''}" href="${esc(hrefs[t])}"${t === active ? ' aria-current="page"' : ''}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">${tabIcons[t]}</svg>
      <span>${labels[t]}</span>
    </a>`;
  return `<nav class="tabbar" aria-label="Main">${(['map', 'daily', 'passport', 'family'] as Tab[]).map(item).join('')}</nav>`;
}
