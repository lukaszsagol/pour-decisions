import type { Theme } from '@pour/themes';
import type { Stage } from '../stage.js';
import { tabBar, type Tab } from '../tabbar.js';
import { applyTheme } from '../theme-css.js';

/** Family tab before a family backend is configured. */
export class FamilyPlaceholder {
  readonly el = document.createElement('div');
  constructor(
    private readonly stage: Stage,
    private readonly theme: Theme,
    private readonly tabs: Record<Tab, string>,
  ) {
    this.el.className = 'screen family-screen';
  }
  async mount(): Promise<void> {
    applyTheme(this.stage.el, this.theme);
    this.stage.el.replaceChildren(this.el);
    this.el.innerHTML = `
      <div class="pp-title" style="padding-top:80px">
        <h1>Family</h1>
        <p>Join your family with an invite code to share stars, daily results and a weekly board. This arrives once the family server is set up.</p>
      </div>
      ${tabBar('family', this.tabs)}`;
    this.el.dataset.ready = 'true';
  }
  destroy(): void {
    this.el.remove();
  }
}
