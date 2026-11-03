import type { Theme } from '@pour/themes';
import type { Progress } from '../economy/save.js';
import { esc, icons } from '../icons.js';
import type { Stage } from '../stage.js';
import { applyTheme } from '../theme-css.js';
import { modes, recentScores, type TrainingMode } from './logic.js';

const W = 300;
const H = 64;

/** Planning score over recent sessions: one line, scores 0–100, newest on the right. */
export function sparkline(scores: number[], color: string, muted: string, grid: string): string {
  if (scores.length === 0) return `<p class="tr-empty">No sessions yet</p>`;
  const x = (i: number) => (scores.length === 1 ? W / 2 : 30 + (i * (W - 38)) / (scores.length - 1));
  const y = (s: number) => 6 + (1 - s / 100) * (H - 12);
  const pts = scores.map((s, i) => `${x(i).toFixed(1)},${y(s).toFixed(1)}`).join(' ');
  const last = scores.length - 1;
  const hits = scores
    .map(
      (s, i) =>
        `<circle cx="${x(i)}" cy="${y(s)}" r="10" fill="transparent"><title>Session ${i + 1}: ${s}</title></circle>`,
    )
    .join('');
  return `
    <svg class="tr-chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Planning score over the last ${scores.length} sessions, latest ${scores[last]}">
      <line x1="30" x2="${W}" y1="${y(100)}" y2="${y(100)}" stroke="${grid}" stroke-width="1"/>
      <line x1="30" x2="${W}" y1="${y(50)}" y2="${y(50)}" stroke="${grid}" stroke-width="1"/>
      <text x="0" y="${y(100) + 4}" font-size="13" font-family="Pixelify Sans, monospace" fill="${muted}">100</text>
      <text x="8" y="${y(50) + 4}" font-size="13" font-family="Pixelify Sans, monospace" fill="${muted}">50</text>
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${x(last)}" cy="${y(scores[last]!)}" r="4.5" fill="${color}" stroke="var(--c-surface)" stroke-width="2"/>
      ${hits}
    </svg>
    <ul class="sr-only">${scores.map((s, i) => `<li>Session ${i + 1}: ${s}</li>`).join('')}</ul>`;
}

/** Brain-training: three optional modes with their planning scores. */
export class TrainingScreen {
  readonly el = document.createElement('div');

  constructor(
    private readonly stage: Stage,
    private readonly theme: Theme,
    private readonly progress: Progress,
  ) {
    this.el.className = 'screen training-screen';
  }

  async mount(): Promise<void> {
    applyTheme(this.stage.el, this.theme);
    this.stage.el.replaceChildren(this.el);
    const k = this.theme.colors;
    const t = this.progress.data.training;
    const card = (mode: TrainingMode) => {
      const m = modes[mode];
      const scores = recentScores(t.sessions, mode);
      return `
        <section class="tr-card" aria-labelledby="tr-${mode}">
          <div class="tr-top">
            <div><h2 id="tr-${mode}" class="tr-name">${m.title}</h2><p class="tr-about">${esc(m.about)}</p></div>
            <a class="btn btn-primary tr-start" href="#/train/${mode}" aria-label="Start ${m.title}">Start</a>
          </div>
          ${sparkline(scores, k.accent, k.muted, k.line)}
        </section>`;
    };
    this.el.innerHTML = `
      <header class="map-header" style="position:static">
        <div class="map-title">
          <a class="icon-btn" href="#/passport" aria-label="Back to passport">${icons.back(k.text)}</a>
          <div><h1 class="map-city">Training</h1><div class="map-bar">Level ${t.rating} of 6 · adapts to your results</div></div>
        </div>
      </header>
      <div class="tr-cards">
        ${(['planning', 'planAhead', 'memory'] as TrainingMode[]).map(card).join('')}
        <p class="tr-note">Planning score is how close you came to the fewest pours. These are puzzles for fun, not a brain test.</p>
      </div>`;
    this.el.dataset.ready = 'true';
  }

  destroy(): void {
    this.el.remove();
  }
}
