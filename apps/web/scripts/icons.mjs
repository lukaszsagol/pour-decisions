// Renders public/icons/icon.svg to the PNG sizes the manifest and the Android app need.
// Run: node apps/web/scripts/icons.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public/icons');
const res = path.join(root, 'android/app/src/main/res');
const svg = fs.readFileSync(path.join(dir, 'icon.svg'), 'utf8');

/** [file, size, padding on each side as a share of size, round] */
const outputs = [
  [path.join(dir, 'icon-192.png'), 192, 0, false],
  [path.join(dir, 'icon-512.png'), 512, 0, false],
  [path.join(dir, 'maskable-512.png'), 512, 0.1, false],
  [path.join(dir, 'apple-touch-icon.png'), 180, 0, false],
];
// Android: legacy square and round icons at 48dp, and the adaptive foreground at 108dp,
// where the launcher shows only the middle 72dp, so the art sits inside that.
for (const [density, scale] of Object.entries({ mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 })) {
  const mip = path.join(res, `mipmap-${density}`);
  outputs.push([path.join(mip, 'ic_launcher.png'), 48 * scale, 0, false]);
  outputs.push([path.join(mip, 'ic_launcher_round.png'), 48 * scale, 0, true]);
  outputs.push([path.join(mip, 'ic_launcher_foreground.png'), 108 * scale, 0.12, false]);
}

const browser = await chromium.launch();
for (const [file, size, pad, round] of outputs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const inner = Math.round(size * (1 - pad * 2));
  const clip = round ? 'border-radius:50%;overflow:hidden;' : '';
  await page.setContent(
    `<body style="margin:0;background:transparent"><div style="${clip}background:#2A1A10;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">` +
      svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `) +
      '</div></body>',
  );
  await page.screenshot({ path: file, omitBackground: round });
  await page.close();
}
await browser.close();
