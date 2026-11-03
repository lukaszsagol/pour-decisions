/**
 * Installing the game as an app. Chrome (Android, desktop) fires
 * `beforeinstallprompt` when the game can be installed; we keep the event and
 * fire it from our own Install button. iPhone Safari has no prompt, so there
 * we show the Share → Add to Home Screen steps instead.
 */

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallMode = 'prompt' | 'ios' | null;

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

/** Running from the home screen already (fullscreen app). */
export function isStandalone(): boolean {
  return (
    (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone or iPad Safari, where installing means Share → Add to Home Screen. */
export function isIosSafari(ua: string = navigator.userAgent, touchPoints = navigator.maxTouchPoints): boolean {
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

/** How the game can be installed right now, or null when it can't (or already is). */
export function installMode(): InstallMode {
  if (installed || isStandalone()) return null;
  if (deferred) return 'prompt';
  return isIosSafari() ? 'ios' : null;
}

export function onInstallChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Shows the browser's install dialog. Resolves true when the player accepts. */
export async function promptInstall(): Promise<boolean> {
  const e = deferred;
  if (!e) return false;
  deferred = null;
  await e.prompt();
  const { outcome } = await e.userChoice;
  if (outcome === 'accepted') installed = true;
  notify();
  return outcome === 'accepted';
}

/** Starts listening. Call once, as early as possible: the event can fire before any screen shows. */
export function watchInstall(target: Window = window): void {
  target.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  target.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    notify();
  });
}

/** Opens the install dialog, or the iPhone steps. */
export function startInstall(host: HTMLElement): void {
  if (installMode() === 'prompt') {
    void promptInstall();
    return;
  }
  const sheet = document.createElement('div');
  sheet.className = 'sheet-backdrop';
  sheet.innerHTML = `
    <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="install-title">
      <h2 id="install-title" class="sheet-title">Install Pour Decisions</h2>
      <ol class="install-steps">
        <li>Tap the Share button in Safari's toolbar.</li>
        <li>Choose <b>Add to Home Screen</b>.</li>
        <li>Open the game from its new icon: it plays fullscreen and offline.</li>
      </ol>
      <button class="btn btn-primary install-close">Got it</button>
    </section>`;
  host.appendChild(sheet);
  const close = () => sheet.remove();
  sheet.addEventListener('click', (e) => e.target === sheet && close());
  sheet.querySelector('.install-close')!.addEventListener('click', close);
  sheet.querySelector<HTMLElement>('.install-close')!.focus();
}
