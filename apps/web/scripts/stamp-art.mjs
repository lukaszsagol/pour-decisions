/* global Image, document, Buffer, console, process -- the page.evaluate callback runs in the browser; the rest is Node */
// Turns the chosen generated passport stamps into single-ink stamps.
// Run: node apps/web/scripts/stamp-art.mjs
//
// docs/design/generated/stamps/choices.json maps a city to the option to use
// (docs/design/generated/stamps/<city>/<option>.png). Like a real rubber stamp, each pixel
// becomes the city's ink (dark enough) or nothing (light), so no white specks glare on the
// card. Output: src/pixel/stamps/<city>.png, 32×32.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const INK = { amsterdam: '#2A5BA8', london: '#B03030', newyork: '#D4AF37', tokyo: '#E0453A' };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generated = path.resolve(root, '../../docs/design/generated/stamps');
const out = path.join(root, 'src/pixel/stamps');
const choices = JSON.parse(fs.readFileSync(path.join(generated, 'choices.json'), 'utf8'));
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [city, option] of Object.entries(choices)) {
  const source = fs.readFileSync(path.join(generated, city, `${option}.png`)).toString('base64');
  const png = await page.evaluate(
    async ({ source, ink }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${source}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      const data = x.getImageData(0, 0, c.width, c.height);
      const p = data.data;
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(ink.slice(i, i + 2), 16));
      for (let k = 0; k < p.length; k += 4) {
        const luma = p[k] * 0.3 + p[k + 1] * 0.59 + p[k + 2] * 0.11;
        const on = p[k + 3] > 127 && luma < 170;
        [p[k], p[k + 1], p[k + 2], p[k + 3]] = on ? [r, g, b, 255] : [0, 0, 0, 0];
      }
      x.putImageData(data, 0, 0);
      return c.toDataURL('image/png').split(',')[1];
    },
    { source, ink: INK[city] },
  );
  fs.writeFileSync(path.join(out, `${city}.png`), Buffer.from(png, 'base64'));
}
await browser.close();
console.log(`${Object.keys(choices).length} stamps → ${path.relative(process.cwd(), out)}`);
