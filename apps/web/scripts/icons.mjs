/* global Image, document, Buffer -- the page.evaluate callbacks run in the browser; Buffer is Node's */
// Renders the pixel-art icon (public/icons/icon-48.png, a 48×48 art-pixel source) to every size
// the web app and the Android app need, plus icon.svg (the same pixels as SVG rectangles).
// Run: node apps/web/scripts/icons.mjs
//
// Pixels scale by whole numbers only, so they stay square and crisp; any space left over takes
// the icon's edge colour. The art keeps its subject inside a 44 px circle, so launchers that crop
// to a circle (Android) or a squircle never cut it.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public/icons');
const res = path.join(root, 'android/app/src/main/res');
const source = fs.readFileSync(path.join(dir, 'icon-48.png')).toString('base64');
const EDGE = '#2A1A10';

/**
 * [file, canvas size, art pixels shown across the canvas's safe width, round]. The icon is drawn
 * at the largest whole scale that fits `art` source pixels into the canvas.
 */
const outputs = [
  [path.join(dir, 'icon-192.png'), 192, 48, false],
  [path.join(dir, 'icon-512.png'), 512, 48, false],
  // Maskable: the platform may crop to an 80 % circle, so the 44 px subject must fit inside it.
  [path.join(dir, 'maskable-512.png'), 512, 58, false],
  [path.join(dir, 'apple-touch-icon.png'), 180, 48, false],
];
// Android: legacy square and round icons at 48 dp; the adaptive foreground at 108 dp, of which
// the launcher shows the middle 72 dp, so 48 art pixels span 72 dp there.
for (const [density, scale] of Object.entries({ mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 })) {
  const mip = path.join(res, `mipmap-${density}`);
  outputs.push([path.join(mip, 'ic_launcher.png'), 48 * scale, 48, false]);
  outputs.push([path.join(mip, 'ic_launcher_round.png'), 48 * scale, 48, true]);
  outputs.push([path.join(mip, 'ic_launcher_foreground.png'), 108 * scale, 72, false]);
}

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, art, round] of outputs) {
  const png = await page.evaluate(
    async ({ source, size, art, round, edge }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${source}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const x = c.getContext('2d');
      x.imageSmoothingEnabled = false;
      if (round) {
        x.beginPath();
        x.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        x.clip();
      }
      x.fillStyle = edge;
      x.fillRect(0, 0, size, size);
      const k = Math.max(1, Math.floor(size / art));
      const w = 48 * k;
      const at = Math.floor((size - w) / 2);
      x.drawImage(img, at, at, w, w);
      return c.toDataURL('image/png').split(',')[1];
    },
    { source, size, art, round, edge: EDGE },
  );
  fs.writeFileSync(file, Buffer.from(png, 'base64'));
}

// icon.svg: one rectangle per run of same-coloured pixels.
const rows = await page.evaluate(async (source) => {
  const img = new Image();
  img.src = `data:image/png;base64,${source}`;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, 48, 48).data;
  const out = [];
  for (let y = 0; y < 48; y++) {
    let start = 0;
    for (let i = 1; i <= 48; i++) {
      const same = i < 48 && [0, 1, 2, 3].every((k) => d[(y * 48 + i) * 4 + k] === d[(y * 48 + start) * 4 + k]);
      if (same) continue;
      const p = (y * 48 + start) * 4;
      if (d[p + 3]) {
        const hex = [d[p], d[p + 1], d[p + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
        out.push(`<rect x="${start}" y="${y}" width="${i - start}" height="1" fill="#${hex}"/>`);
      }
      start = i;
    }
  }
  return out.join('');
}, source);
fs.writeFileSync(
  path.join(dir, 'icon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" shape-rendering="crispEdges">${rows}</svg>\n`,
);
await browser.close();
