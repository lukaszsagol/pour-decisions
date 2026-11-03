import type { Progress } from '../economy/save.js';

/** Settings sheet: sound and starting over. Extra rows can be appended by other features. */
export const settingsRows: ((sheet: HTMLElement, progress: Progress) => void)[] = [];

export function openSettings(host: HTMLElement, progress: Progress): void {
  const sheet = document.createElement('div');
  sheet.className = 'sheet-backdrop';
  sheet.innerHTML = `
    <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <h2 id="settings-title" class="sheet-title">Settings</h2>
      <label class="sheet-row"><span>Sound</span><input type="checkbox" class="set-sound" ${progress.data.settings.muted ? '' : 'checked'}></label>
      <button class="btn btn-ghost set-reset">Start over</button>
      <div class="set-extra"></div>
      <button class="btn btn-primary set-close">Done</button>
    </section>`;
  host.appendChild(sheet);
  const close = () => sheet.remove();
  sheet.addEventListener('click', (e) => e.target === sheet && close());
  sheet.querySelector('.set-close')!.addEventListener('click', close);
  sheet
    .querySelector<HTMLInputElement>('.set-sound')!
    .addEventListener('change', (e) => progress.setMuted(!(e.target as HTMLInputElement).checked));
  const reset = sheet.querySelector<HTMLButtonElement>('.set-reset')!;
  reset.addEventListener('click', () => {
    if (reset.dataset.confirm !== 'true') {
      reset.dataset.confirm = 'true';
      reset.textContent = 'Tap again to erase all progress';
      return;
    }
    progress.reset();
    close();
    location.hash = '#/';
    location.reload();
  });
  for (const row of settingsRows) row(sheet.querySelector('.set-extra')!, progress);
  sheet.querySelector<HTMLElement>('.set-close')!.focus();
}
