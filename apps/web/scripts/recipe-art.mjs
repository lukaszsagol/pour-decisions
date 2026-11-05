/* global Image, document, Buffer, console, process -- the page.evaluate callback runs in the browser; the rest is Node */
// Turns the chosen generated recipe drinks into the game's 35×75 card pictures.
// Run: node apps/web/scripts/recipe-art.mjs
//
// docs/design/generated/recipes/choices.json maps "<city>-<bar>" to the option to use
// ("opt-2" → docs/design/generated/recipes/<city>-<bar>/opt-2.png), or to
// { "option": "opt-0", "outline": true } for pale drinks whose outline the background
// removal ate: light pixels on the drink's outer edge are then repainted in the outline colour.
// "key": true cuts the drink out of a flat backdrop itself (for drinks generated without
// background removal): the backdrop's colour is flood-filled away from the image's edges. Each drink is trimmed to
// its opaque pixels, then centred and stood on the bottom edge of a transparent 35×75 canvas,
// the size of the card's glass slot. Output: src/pixel/recipes/<city>-<bar>.png.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generated = path.resolve(root, '../../docs/design/generated/recipes');
const out = path.join(root, 'src/pixel/recipes');
const choices = JSON.parse(fs.readFileSync(path.join(generated, 'choices.json'), 'utf8'));
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [id, choice] of Object.entries(choices)) {
  const { option, outline = false, key = false } = typeof choice === 'string' ? { option: choice } : choice;
  const source = fs.readFileSync(path.join(generated, id, `${option}.png`)).toString('base64');
  const png = await page.evaluate(
    async ({ source, outline, key }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${source}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      if (key) {
        // The backdrop is the commonest colour along the image's edges; flood-fill it away from them.
        const data = x.getImageData(0, 0, c.width, c.height);
        const p = data.data;
        const edge = [];
        for (let i = 0; i < c.width; i++) edge.push([i, 0], [i, c.height - 1]);
        for (let y = 0; y < c.height; y++) edge.push([0, y], [c.width - 1, y]);
        const counts = new Map();
        for (const [i, y] of edge) {
          const k = (y * c.width + i) * 4;
          const id = `${p[k]},${p[k + 1]},${p[k + 2]}`;
          counts.set(id, (counts.get(id) ?? 0) + 1);
        }
        const bg = [...counts.entries()]
          .sort((a, b) => b[1] - a[1])[0][0]
          .split(',')
          .map(Number);
        const near = (k) => Math.abs(p[k] - bg[0]) + Math.abs(p[k + 1] - bg[1]) + Math.abs(p[k + 2] - bg[2]) < 90;
        const todo = edge.slice();
        while (todo.length) {
          const [i, y] = todo.pop();
          if (i < 0 || y < 0 || i >= c.width || y >= c.height) continue;
          const k = (y * c.width + i) * 4;
          if (p[k + 3] === 0 || !near(k)) continue;
          p[k + 3] = 0;
          todo.push([i + 1, y], [i - 1, y], [i, y + 1], [i, y - 1]);
        }
        x.putImageData(data, 0, 0);
      }
      const d = x.getImageData(0, 0, c.width, c.height).data;
      let [x0, y0, x1, y1] = [c.width, c.height, -1, -1];
      for (let y = 0; y < c.height; y++)
        for (let i = 0; i < c.width; i++)
          if (d[(y * c.width + i) * 4 + 3] > 127) {
            x0 = Math.min(x0, i);
            x1 = Math.max(x1, i);
            y0 = Math.min(y0, y);
            y1 = Math.max(y1, y);
          }
      const w = x1 - x0 + 1;
      const h = y1 - y0 + 1;
      const o = document.createElement('canvas');
      o.width = 35;
      o.height = 75;
      const ox = o.getContext('2d');
      ox.drawImage(c, x0, y0, w, h, Math.floor((35 - w) / 2), 75 - h, w, h);
      // Hard pixels only: anything half transparent becomes solid or clear.
      const od = ox.getImageData(0, 0, 35, 75);
      for (let k = 3; k < od.data.length; k += 4) od.data[k] = od.data[k] > 127 ? 255 : 0;
      if (outline) {
        const a = (i, y) => i >= 0 && y >= 0 && i < 35 && y < 75 && od.data[(y * 35 + i) * 4 + 3] > 0;
        const edge = [];
        for (let y = 0; y < 75; y++)
          for (let i = 0; i < 35; i++) {
            const k = (y * 35 + i) * 4;
            const light = od.data[k] * 0.3 + od.data[k + 1] * 0.59 + od.data[k + 2] * 0.11 > 110;
            if (a(i, y) && light && (!a(i - 1, y) || !a(i + 1, y) || !a(i, y - 1) || !a(i, y + 1))) edge.push(k);
          }
        for (const k of edge) [od.data[k], od.data[k + 1], od.data[k + 2]] = [0x1b, 0x1a, 0x2e];
      }
      ox.putImageData(od, 0, 0);
      return o.toDataURL('image/png').split(',')[1];
    },
    { source, outline, key },
  );
  fs.writeFileSync(path.join(out, `${id}.png`), Buffer.from(png, 'base64'));
}
await browser.close();
console.log(`${Object.keys(choices).length} recipe drinks → ${path.relative(process.cwd(), out)}`);
