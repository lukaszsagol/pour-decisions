import type { Theme } from '@pour/themes';
import type { Progress } from './economy/save.js';
import { esc } from './icons.js';
import { toAnnounce, type Feature } from './onboarding.js';
import { bartenderImg } from './pixel/bartenders.js';

const CARDS: Record<Feature, { title: string; text: string; action: string; href: string }> = {
  daily: {
    title: "Tonight's pour",
    text: 'One new level every night, the same for everyone. Your first finish each night earns a hint.',
    action: "Play tonight's pour",
    href: '#/daily',
  },
  book: {
    title: 'Your cocktail book',
    text: 'You finished your first bar and earned its cocktail. Every bar adds a real recipe you can make at home.',
    action: 'Open the cocktail book',
    href: '#/book',
  },
  training: {
    title: 'Training',
    text: 'Optional puzzles for planning, thinking ahead and memory. Play them whenever you like.',
    action: 'Try training',
    href: '#/training',
  },
};

/**
 * When a feature has just opened, the bartender announces it once, on the next passport or map
 * the player sees. One at a time: a second one waits for the next visit.
 */
export function announceNext(host: HTMLElement, progress: Progress, theme: Theme): void {
  const feature = toAnnounce(progress)[0];
  if (!feature || host.querySelector('.an-sheet')) return;
  progress.markIntro('announced', feature);
  const c = CARDS[feature];
  const sheet = document.createElement('div');
  sheet.className = 'sheet-backdrop an-sheet';
  sheet.innerHTML = `
    <section class="an-card" role="dialog" aria-modal="true" aria-labelledby="an-title">
      ${bartenderImg(theme.id, 'cheer', 'an-barkeep')}
      <div class="an-kicker">New · unlocked</div>
      <h2 class="an-title" id="an-title">${esc(c.title)}</h2>
      <p>${esc(c.text)}</p>
      <a class="btn btn-primary an-go" href="${c.href}">${esc(c.action)}</a>
      <button class="btn btn-ghost an-later">Later</button>
    </section>`;
  host.appendChild(sheet);
  const close = () => sheet.remove();
  sheet.addEventListener('click', (e) => e.target === sheet && close());
  sheet.querySelector('.an-later')!.addEventListener('click', close);
  sheet.querySelector('.an-go')!.addEventListener('click', close);
  sheet.querySelector<HTMLElement>('.an-go')!.focus();
}
