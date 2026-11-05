import type { Theme } from '@pour/themes';
import { dateKey } from '../daily/generate.js';
import { esc } from '../icons.js';
import type { Stage } from '../stage.js';
import { tabBar, type Tab } from '../tabbar.js';
import { applyTheme } from '../theme-css.js';
import { initial, type FamilyBackend, type Group, type Member } from './backend.js';

export function avatar(m: Pick<Member, 'name' | 'color'>, size = 24): string {
  return `<span class="fam-avatar" style="background:${m.color};width:${size}px;height:${size}px" aria-hidden="true">${esc(initial(m.name))}</span>`;
}

/** Family tab: create or join a group, then members, the weekly board and tonight's results. */
export class FamilyScreen {
  readonly el = document.createElement('div');

  constructor(
    private readonly stage: Stage,
    private readonly theme: Theme,
    private readonly tabs: Record<Tab, string>,
    private readonly backend: FamilyBackend,
  ) {
    this.el.className = 'screen family-screen';
  }

  async mount(): Promise<void> {
    applyTheme(this.stage.el, this.theme);
    this.stage.el.replaceChildren(this.el);
    await this.render();
    this.el.dataset.ready = 'true';
  }

  destroy(): void {
    this.el.remove();
  }

  private async render(): Promise<void> {
    const group = await this.backend.group();
    this.el.innerHTML = `<div class="fam-body">${group ? await this.groupHtml(group) : this.joinHtml()}</div>${tabBar('passport', this.tabs)}`;
    if (!group) this.bindJoin();
    else
      this.el
        .querySelector('.fam-leave')!
        .addEventListener('click', () => void this.backend.leave().then(() => this.render()));
  }

  private joinHtml(): string {
    return `
      <div class="pp-title"><h1>Family</h1><p>Share stars, daily results and a weekly board with your family. No accounts: just an invite code.</p></div>
      <form class="fam-form fam-create">
        <h2>Start a family group</h2>
        <label>Your name<input name="me" required maxlength="20" autocomplete="nickname"></label>
        <label>Group name<input name="group" required maxlength="24" value="Family"></label>
        <button class="btn btn-primary">Create group</button>
      </form>
      <form class="fam-form fam-join">
        <h2>Join with a code</h2>
        <label>Your name<input name="me" required maxlength="20" autocomplete="nickname"></label>
        <label>Invite code<input name="code" required maxlength="6" autocapitalize="characters" spellcheck="false"></label>
        <button class="btn btn-outline">Join</button>
        <p class="fam-error" role="alert"></p>
      </form>`;
  }

  private bindJoin(): void {
    const create = this.el.querySelector<HTMLFormElement>('.fam-create')!;
    create.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(create);
      void this.backend.createGroup(String(f.get('group')), String(f.get('me'))).then(() => this.render());
    });
    const join = this.el.querySelector<HTMLFormElement>('.fam-join')!;
    join.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(join);
      this.backend
        .joinGroup(String(f.get('code')), String(f.get('me')))
        .then(() => this.render())
        .catch((err: Error) => (join.querySelector('.fam-error')!.textContent = err.message));
    });
  }

  private async groupHtml(g: Group): Promise<string> {
    const board = [...g.members].sort((a, b) => b.weekStars - a.weekStars);
    const daily = await this.backend.daily(dateKey());
    const byId = new Map(g.members.map((m) => [m.id, m]));
    const row = (m: Member, i: number) =>
      `<li class="fam-row"><span class="fam-rank">${i + 1}</span>${avatar(m)}<span class="fam-name">${esc(m.name)}${m.id === this.backend.me() ? ' (you)' : ''}</span><span class="fam-val">★ ${m.weekStars}</span></li>`;
    const dailyRows = daily.length
      ? daily
          .map((r) => {
            const m = byId.get(r.memberId);
            return m
              ? `<li class="fam-row">${avatar(m)}<span class="fam-name">${esc(m.name)}</span><span class="fam-val">${'★'.repeat(r.stars)} ${r.moves} moves</span></li>`
              : '';
          })
          .join('')
      : '<li class="fam-empty">Nobody has poured tonight yet</li>';
    return `
      <div class="pp-title"><h1>${esc(g.name)}</h1><p>Invite code <b class="fam-code">${esc(g.inviteCode)}</b> · ${g.members.length} members</p></div>
      <section class="fam-card" aria-labelledby="fam-week"><h2 id="fam-week">This week</h2><ol class="fam-list">${board.map(row).join('')}</ol></section>
      <section class="fam-card" aria-labelledby="fam-daily"><h2 id="fam-daily">Tonight's pour</h2><ul class="fam-list">${dailyRows}</ul></section>
      <section class="fam-card" aria-labelledby="fam-where"><h2 id="fam-where">Where everyone is</h2><ul class="fam-list">${g.members
        .map(
          (m) =>
            `<li class="fam-row">${avatar(m)}<span class="fam-name">${esc(m.name)}</span><span class="fam-val">Level ${m.current}</span></li>`,
        )
        .join('')}</ul></section>
      <button class="btn btn-ghost fam-leave">Leave group</button>`;
  }
}
