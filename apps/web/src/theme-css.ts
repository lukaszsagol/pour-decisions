import type { Theme } from '@pour/themes';

/** Exposes a theme's colours and fonts as CSS custom properties (`--c-accent`, `--f-display`). */
export function applyTheme(el: HTMLElement, theme: Theme): void {
  for (const [key, value] of Object.entries(theme.colors)) el.style.setProperty(`--c-${key}`, value);
  el.style.setProperty('--f-ui', `'${theme.fonts.ui}', system-ui, sans-serif`);
  el.style.setProperty('--f-display', `'${theme.fonts.display}', ${theme.fonts.display === theme.fonts.ui ? 'system-ui, sans-serif' : 'serif'}`);
  document.body.style.background = theme.colors.ground;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.colors.ground);
}

/** A theme colour that may be missing in some cities, with a fallback. */
export function color(theme: Theme, key: string, fallback: string): string {
  return theme.colors[key] ?? fallback;
}
