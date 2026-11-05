/**
 * Feature flags, off by default. Turn on with `?flags=family,lives` in the
 * address (remembered on the device) or in the hidden debug menu.
 * `share`: the Share buttons, off until a better way to share is decided (owner, 2026-11-05).
 */
export type Flag = 'family' | 'lives' | 'share';
const KEY = 'pour-decisions:flags';

function read(): Set<Flag> {
  const set = new Set<Flag>();
  try {
    for (const f of JSON.parse(localStorage.getItem(KEY) ?? '[]') as Flag[]) set.add(f);
    const fromUrl = new URLSearchParams(location.search).get('flags');
    if (fromUrl !== null) {
      set.clear();
      for (const f of fromUrl.split(',').filter(Boolean)) set.add(f as Flag);
      localStorage.setItem(KEY, JSON.stringify([...set]));
    }
  } catch {
    // No storage: flags stay off.
  }
  return set;
}

const flags = read();

export function isOn(flag: Flag): boolean {
  return flags.has(flag);
}

export function setFlag(flag: Flag, on: boolean): void {
  if (on) flags.add(flag);
  else flags.delete(flag);
  try {
    localStorage.setItem(KEY, JSON.stringify([...flags]));
  } catch {
    // Ignore.
  }
}
