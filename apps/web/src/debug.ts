import { settingsRows } from './passport/settings.js';
import { downloadLog } from './playlog.js';
import { playLog } from './state.js';

/**
 * Hidden debug menu: tap the version line in Settings five times to show
 * the play log export (and a way to clear it).
 */
settingsRows.push((host) => {
  const version = document.createElement('button');
  version.className = 'set-version';
  version.textContent = `Version ${__APP_VERSION__}`;
  let taps = 0;
  version.addEventListener('click', () => {
    if (++taps < 5 || host.querySelector('.debug')) return;
    const box = document.createElement('div');
    box.className = 'debug';
    box.innerHTML = `
      <div class="debug-title">Debug</div>
      <div class="debug-count">${playLog.all().length} logged events</div>
      <button class="btn btn-outline debug-export">Export play log</button>
      <button class="btn btn-ghost debug-clear">Clear play log</button>`;
    box.querySelector('.debug-export')!.addEventListener('click', () => downloadLog(playLog));
    box.querySelector('.debug-clear')!.addEventListener('click', () => {
      playLog.clear();
      box.querySelector('.debug-count')!.textContent = '0 logged events';
    });
    host.appendChild(box);
  });
  host.appendChild(version);
});
