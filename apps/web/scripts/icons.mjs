// Renders public/icons/icon.svg to the PNG sizes the manifest needs. Run: node apps/web/scripts/icons.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/icons');
const svg = fs.readFileSync(path.join(dir, 'icon.svg'), 'utf8');
const browser = await chromium.launch();
for (const [name, size, pad] of [
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['maskable-512.png', 512, 0.1],
  ['apple-touch-icon.png', 180, 0],
]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const inner = Math.round(size * (1 - pad * 2));
  await page.setContent(
    `<body style="margin:0;background:#2A1A10;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">` +
      svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `) +
      '</body>',
  );
  await page.screenshot({ path: path.join(dir, name) });
  await page.close();
}
await browser.close();
