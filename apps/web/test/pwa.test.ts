import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { swSource } from '../sw-plugin.js';

const pub = path.resolve(import.meta.dirname, '../public');

describe('installable web app', () => {
  it('has a manifest whose icons exist', () => {
    const m = JSON.parse(fs.readFileSync(path.join(pub, 'manifest.webmanifest'), 'utf8'));
    expect(m).toMatchObject({ name: 'Pour Decisions', display: 'standalone', start_url: './' });
    for (const icon of m.icons) expect(fs.existsSync(path.join(pub, icon.src)), icon.src).toBe(true);
    expect(m.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true);
  });

  it('builds a service worker that precaches the given files', () => {
    const src = swSource('pour-test', ['./', './assets/index.js']);
    expect(src).toContain('"pour-test"');
    expect(src).toContain('./assets/index.js');
    expect(() => new Function(src)).not.toThrow();
  });
});
