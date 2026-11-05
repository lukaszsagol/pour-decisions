/* global Image, document, Buffer, console, process -- the page.evaluate callback runs in the browser; the rest is Node */
// Turns chosen generated sprites into the game's pictures. Run:
//   node apps/web/scripts/sprite-art.mjs recipes      recipe-card drinks, 35×75
//   node apps/web/scripts/sprite-art.mjs bartenders   bartenders, 48×64
//   node apps/web/scripts/sprite-art.mjs card-scenes  passport card vignettes, 64×80
//
// docs/design/generated/<set>/choices.json maps an output name to the option to use
// ("opt-2" → docs/design/generated/<set>/<name>/opt-2.png), or to an object:
//   { "option": "opt-0", "dir": "amsterdam-cheer" }  take it from another folder;
//   "outline": true  for pale drinks whose outline the background removal ate: light pixels on
//                    the edge are repainted in the outline colour;
//   "key": true      cut the sprite out of a flat backdrop itself (generated without background
//                    removal): the backdrop's colour is flood-filled away from the image's edges.
// Each sprite is trimmed to its opaque pixels, then centred and stood on the bottom edge of a
// transparent canvas of the set's size. Output: src/pixel/<set>/<name>.png.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SETS = { recipes: { w: 35, h: 75 }, bartenders: { w: 48, h: 64 }, 'card-scenes': { w: 64, h: 80 } };
const set = process.argv[2];
if (!SETS[set]) {
  console.error(`Usage: node apps/web/scripts/sprite-art.mjs <${Object.keys(SETS).join('|')}>`);
  process.exit(1);
}
const { w: W, h: H } = SETS[set];
const generated = path.resolve(root, `../../docs/design/generated/${set}`);
const out = path.join(root, `src/pixel/${set}`);
const choices = JSON.parse(fs.readFileSync(path.join(generated, 'choices.json'), 'utf8'));
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [id, choice] of Object.entries(choices)) {
  const { option, dir = id, outline = false, key = false } = typeof choice === 'string' ? { option: choice } : choice;
  const source = fs.readFileSync(path.join(generated, dir, `${option}.png`)).toString('base64');
  const png = await page.evaluate(
    async ({ source, outline, key, W, H }) => {
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
        const opaque = (i, y) => i >= 0 && y >= 0 && i < c.width && y < c.height && p[(y * c.width + i) * 4 + 3] > 0;
        // Some backdrops sit inside a frame of another colour: a second pass then removes what
        // the first exposed, but only when it is the bright green asked for as the key colour.
        for (let pass = 0; pass < 2; pass++) {
          // The outermost opaque pixels: on the image's edge, or next to what is already cut away.
          const edge = [];
          for (let y = 0; y < c.height; y++)
            for (let i = 0; i < c.width; i++)
              if (
                opaque(i, y) &&
                (i === 0 ||
                  y === 0 ||
                  i === c.width - 1 ||
                  y === c.height - 1 ||
                  !opaque(i - 1, y) ||
                  !opaque(i + 1, y) ||
                  !opaque(i, y - 1) ||
                  !opaque(i, y + 1))
              )
                edge.push([i, y]);
          const counts = new Map();
          for (const [i, y] of edge) {
            const k = (y * c.width + i) * 4;
            const id = `${p[k]},${p[k + 1]},${p[k + 2]}`;
            counts.set(id, (counts.get(id) ?? 0) + 1);
          }
          const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
          if (!top) break;
          if (pass === 1) {
            const [r, g, b] = top[0].split(',').map(Number);
            if (!(g > r + 60 && g > b + 60)) break;
          }
          const bg = top[0].split(',').map(Number);
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
        }
        // The bright key green can also be enclosed (inside a glass, between arms): clear it everywhere.
        for (let k = 0; k < p.length; k += 4) {
          const [r, g, b] = [p[k], p[k + 1], p[k + 2]];
          if (g > 150 && g > r + 80 && g > b + 80) p[k + 3] = 0;
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
      o.width = W;
      o.height = H;
      const ox = o.getContext('2d');
      ox.drawImage(c, x0, y0, w, h, Math.floor((W - w) / 2), H - h, w, h);
      // Hard pixels only: anything half transparent becomes solid or clear.
      const od = ox.getImageData(0, 0, W, H);
      for (let k = 3; k < od.data.length; k += 4) od.data[k] = od.data[k] > 127 ? 255 : 0;
      if (outline) {
        const a = (i, y) => i >= 0 && y >= 0 && i < W && y < H && od.data[(y * W + i) * 4 + 3] > 0;
        const edge = [];
        for (let y = 0; y < H; y++)
          for (let i = 0; i < W; i++) {
            const k = (y * W + i) * 4;
            const light = od.data[k] * 0.3 + od.data[k + 1] * 0.59 + od.data[k + 2] * 0.11 > 110;
            if (a(i, y) && light && (!a(i - 1, y) || !a(i + 1, y) || !a(i, y - 1) || !a(i, y + 1))) edge.push(k);
          }
        for (const k of edge) [od.data[k], od.data[k + 1], od.data[k + 2]] = [0x1b, 0x1a, 0x2e];
      }
      ox.putImageData(od, 0, 0);
      return o.toDataURL('image/png').split(',')[1];
    },
    { source, outline, key, W, H },
  );
  fs.writeFileSync(path.join(out, `${id}.png`), Buffer.from(png, 'base64'));
}
await browser.close();
console.log(`${Object.keys(choices).length} ${set} → ${path.relative(process.cwd(), out)}`);
