import { describe, expect, it, vi } from 'vitest';

describe('install', () => {
  it('recognises iPhone Safari but not other iPhone browsers or Android', async () => {
    vi.stubGlobal('navigator', { userAgent: '', maxTouchPoints: 0 });
    const { isIosSafari } = await import('../src/install.js');
    const safari =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
    expect(isIosSafari(safari, 5)).toBe(true);
    expect(isIosSafari(safari.replace('Version/18.0', 'CriOS/130.0'), 5)).toBe(false);
    expect(
      isIosSafari('Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36', 5),
    ).toBe(false);
    const ipadDesktop =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
    expect(isIosSafari(ipadDesktop, 5)).toBe(true);
    expect(isIosSafari(ipadDesktop, 0)).toBe(false);
    vi.unstubAllGlobals();
  });

  it('keeps the browser prompt, fires it on demand and forgets it once installed', async () => {
    vi.resetModules();
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/131.0', maxTouchPoints: 0 });
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const install = await import('../src/install.js');
    const target = new EventTarget() as unknown as Window;
    install.watchInstall(target);
    expect(install.installMode()).toBeNull();
    const changes = vi.fn();
    install.onInstallChange(changes);
    const prompt = vi.fn(async () => undefined);
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    });
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(install.installMode()).toBe('prompt');
    expect(await install.promptInstall()).toBe(true);
    expect(prompt).toHaveBeenCalledOnce();
    expect(install.installMode()).toBeNull();
    expect(changes).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });

  it('offers the manual steps on Android when Chrome holds back its prompt', async () => {
    vi.resetModules();
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 15) Chrome/131.0 Mobile', maxTouchPoints: 5 });
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const install = await import('../src/install.js');
    expect(install.installMode()).toBe('android');
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    expect(install.installMode()).toBeNull();
    vi.unstubAllGlobals();
  });
});
