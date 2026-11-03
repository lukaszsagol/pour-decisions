import type { Theme } from '@pour/themes';
import { Container, FillGradient, Graphics, Text } from 'pixi.js';
import { roundRect } from '../pixi-util.js';
import { color } from '../theme-css.js';
import { STAGE_H, STAGE_W } from '../stage.js';

/** Where the counter starts on the level screen (design: 660 px). */
export const COUNTER_TOP = 660;

/**
 * Draws a city's level-screen backdrop: background, top band, back-bar shelf
 * and the counter edge. Each city has its own function; unknown cities get a
 * plain version built from the theme colours.
 */
export function drawLevelDecor(theme: Theme): Container {
  const c = new Container();
  const fn = decorByCity[theme.id] ?? plainDecor;
  fn(c, theme);
  return c;
}

type DecorFn = (c: Container, theme: Theme) => void;

const decorByCity: Partial<Record<string, DecorFn>> = {
  amsterdam: amsterdamDecor,
  london: londonDecor,
  newyork: newYorkDecor,
  tokyo: tokyoDecor,
};

function counter(g: Graphics, theme: Theme, edge: string, edgeH: number): void {
  g.rect(0, COUNTER_TOP, STAGE_W, edgeH).fill({ color: edge });
  g.rect(0, COUNTER_TOP + edgeH, STAGE_W, 24 - edgeH).fill({ color: theme.colors.counterTop });
  g.rect(0, COUNTER_TOP + 24, STAGE_W, STAGE_H - COUNTER_TOP - 24).fill({ color: theme.colors.counterFront });
}

function plainDecor(c: Container, theme: Theme): void {
  const g = new Graphics();
  g.rect(0, 0, STAGE_W, STAGE_H).fill({ color: theme.colors.ground });
  g.rect(0, 0, STAGE_W, 56).fill({ color: theme.colors.surfaceAlt });
  g.roundRect(14, 194, STAGE_W - 28, 6, 2).fill({ color: theme.colors.line });
  counter(g, theme, theme.colors.accent, 4);
  c.addChild(g);
}

function amsterdamDecor(c: Container, theme: Theme): void {
  const k = theme.colors;
  const g = new Graphics();
  // Wood panelling: ten vertical boards in two tones.
  for (let i = 0; i < 10; i++) g.rect(i * 39, 0, 39, STAGE_H).fill({ color: i % 2 ? k.surfaceAlt : k.ground });

  // Delft tile band.
  g.rect(0, 0, STAGE_W, 56).fill({ color: color(theme, 'tileBand', '#E6D7B8') });
  const tileW = (STAGE_W - 8 - 6 * 4) / 7;
  const tile = color(theme, 'tile', k.accent);
  for (let i = 0; i < 7; i++) {
    const x = 4 + i * (tileW + 4);
    g.rect(x, 4, tileW, 48).fill({ color: color(theme, 'tileFace', k.text) });
    const cx = x + tileW / 2;
    if (i % 2 === 0) {
      g.circle(cx, 28, 12).stroke({ width: 2, color: tile });
      g.poly([cx, 28 - 5.6, cx + 5.6, 28, cx, 28 + 5.6, cx - 5.6, 28]).fill({ color: tile });
    } else {
      const d = 14.1;
      g.poly([cx, 28 - d, cx + d, 28, cx, 28 + d, cx - d, 28]).stroke({ width: 2, color: tile });
    }
  }

  // Stoneware bottles on the back-bar shelf.
  const light = { body: color(theme, 'stoneware', '#B9A586'), cap: color(theme, 'stonewareCap', '#8C7A60') };
  const dark = { body: color(theme, 'stonewareDark', '#9C8A6E'), cap: color(theme, 'stonewareCapDark', '#7A6A52') };
  const label = color(theme, 'tileFace', k.text);
  const bottle = (x: number, h: number, tone: typeof light) => {
    const y = 194 - h;
    roundRect(g, x, y, 26, h, [9, 9, 6, 6]).fill({ color: tone.body });
    // Glazed stoneware: lit from the lamp side, shaded on the other.
    const lit = x < STAGE_W / 2 ? x + 26 - 8 : x + 3;
    const dark = x < STAGE_W / 2 ? x + 2 : x + 26 - 7;
    roundRect(g, dark, y + 6, 5, h - 9, [3, 3, 3, 3]).fill({ color: '#000000', alpha: 0.18 });
    roundRect(g, lit, y + 6, 4, h - 14, [2, 2, 2, 2]).fill({ color: '#FFFFFF', alpha: 0.28 });
    g.roundRect(x + 9, y - 6, 8, 8, 2).fill({ color: tone.cap });
    g.rect(x + 4, y + Math.round(h * 0.38), 18, 10).fill({ color: label });
  };
  bottle(24, 42, light);
  bottle(60, 36, dark);
  bottle(96, 46, light);
  bottle(268, 40, dark);
  bottle(304, 46, light);
  bottle(340, 36, dark);

  // Hanging lamp.
  g.rect(194, 122, 2, 14).fill({ color: color(theme, 'cord', '#1A0F08') });
  g.poly([185, 136, 205, 136, 215, 156, 175, 156]).fill({ color: color(theme, 'lamp', k.starDone) });
  roundRect(g, 188, 156, 14, 6, [0, 0, 7, 7]).fill({ color: color(theme, 'lampGlow', '#FFE2A8') });

  // Shelf plank with a lit edge and a shadow on the wall below.
  g.rect(14, 200, STAGE_W - 28, 16).fill(verticalFade('rgba(0,0,0,0.42)'));
  g.roundRect(14, 194, STAGE_W - 28, 6, 2).fill({ color: color(theme, 'shelf', k.line) });
  g.rect(16, 194, STAGE_W - 32, 1).fill({ color: '#FFFFFF', alpha: 0.18 });
  counter(g, theme, color(theme, 'brass', '#C9A24A'), 4);
  // Counter: polished top catching the light, shadow under its edge.
  g.rect(0, COUNTER_TOP + 4, STAGE_W, 20).fill(verticalFade('rgba(255,220,170,0.14)'));
  g.rect(0, COUNTER_TOP + 24, STAGE_W, 22).fill(verticalFade('rgba(0,0,0,0.45)'));
  c.addChild(g);
  c.addChild(barLighting());
}

/** Warm lamp light, a soft cone onto the glasses, board seams and a vignette. */
function barLighting(): Graphics {
  const g = new Graphics();
  for (let i = 1; i < 10; i++) g.rect(i * 39 - 1, 200, 1, COUNTER_TOP - 200).fill({ color: '#000000', alpha: 0.22 });
  g.poly([180, 160, 210, 160, 330, COUNTER_TOP, 60, COUNTER_TOP]).fill(verticalFade('rgba(255,200,120,0.12)'));
  g.ellipse(STAGE_W / 2, 170, 210, 150).fill(radial('rgba(255,190,110,0.28)'));
  // Darker towards the sides, so the glasses in the middle stand out.
  g.rect(0, 214, 80, COUNTER_TOP - 214).fill(sideFade(false));
  g.rect(STAGE_W - 80, 214, 80, COUNTER_TOP - 214).fill(sideFade(true));
  return g;
}

const cache = new Map<string, FillGradient>();

/** Colour at the top fading to clear at the bottom (local to the shape). */
function verticalFade(colour: string): FillGradient {
  const key = `v${colour}`;
  if (!cache.has(key))
    cache.set(
      key,
      new FillGradient({
        type: 'linear',
        start: { x: 0, y: 0 },
        end: { x: 0, y: 1 },
        colorStops: [
          { offset: 0, color: colour },
          { offset: 1, color: 'rgba(0,0,0,0)' },
        ],
        textureSpace: 'local',
      }),
    );
  return cache.get(key)!;
}

/** Colour in the middle fading to clear at the edge (local to the shape). */
function radial(colour: string): FillGradient {
  const key = `r${colour}`;
  if (!cache.has(key))
    cache.set(
      key,
      new FillGradient({
        type: 'radial',
        center: { x: 0.5, y: 0.5 },
        innerRadius: 0,
        outerCenter: { x: 0.5, y: 0.5 },
        outerRadius: 0.5,
        colorStops: [
          { offset: 0, color: colour },
          { offset: 1, color: 'rgba(0,0,0,0)' },
        ],
        textureSpace: 'local',
      }),
    );
  return cache.get(key)!;
}

function sideFade(right: boolean): FillGradient {
  const key = `side${right}`;
  if (!cache.has(key))
    cache.set(
      key,
      new FillGradient({
        type: 'linear',
        start: { x: right ? 1 : 0, y: 0 },
        end: { x: right ? 0 : 1, y: 0 },
        colorStops: [
          { offset: 0, color: 'rgba(0,0,0,0.38)' },
          { offset: 1, color: 'rgba(0,0,0,0)' },
        ],
        textureSpace: 'local',
      }),
    );
  return cache.get(key)!;
}

function tokyoDecor(c: Container, theme: Theme): void {
  const k = theme.colors;
  const g = new Graphics();
  g.rect(0, 0, STAGE_W, STAGE_H).fill({ color: k.ground });
  // Noren curtain panels.
  const band = color(theme, 'band', '#23306E');
  const panelW = (STAGE_W - 12 - 8) / 3;
  for (let i = 0; i < 3; i++) roundRect(g, 6 + i * (panelW + 4), 0, panelW, 58, [0, 0, 4, 4]).fill({ color: band });
  g.circle(STAGE_W / 2, 29, 14).stroke({ width: 2, color: k.text });
  // Bottle shelf with a lantern.
  const shelfBottle = color(theme, 'shelfBottle', '#1A2148');
  const bottle = (x: number, h: number) => {
    roundRect(g, x, 198 - h, 16, h, [4, 4, 3, 3]).fill({ color: shelfBottle });
    g.rect(x + 2, 198 - h + h / 2 - 4, 12, 8).fill({ color: k.text, alpha: 0.85 });
  };
  [24, 48, 72, 96].forEach((x, i) => bottle(x, [34, 28, 40, 30][i]!));
  [278, 302, 326, 350].forEach((x, i) => bottle(x, [30, 40, 26, 34][i]!));
  g.rect(194, 158, 2, 6).fill({ color: color(theme, 'cord', '#3A2A2A') });
  g.roundRect(185, 164, 20, 26, 10).fill({ color: color(theme, 'lantern', '#E0453A') });
  g.roundRect(16, 198, STAGE_W - 32, 4, 2).fill({ color: color(theme, 'shelf', k.line) });
  counter(g, theme, color(theme, 'counterEdge', k.counterTop), 14);
  c.addChild(g);
  const kanji = new Text({
    text: '酒',
    style: { fontFamily: 'Zen Kaku Gothic New', fontWeight: '700', fontSize: 14, fill: k.text },
  });
  kanji.anchor.set(0.5);
  kanji.position.set(STAGE_W / 2, 29);
  c.addChild(kanji);
}

function londonDecor(c: Container, theme: Theme): void {
  const k = theme.colors;
  const brass = color(theme, 'brass', k.accent);
  const g = new Graphics();
  // Panelled bar room.
  g.rect(0, 0, STAGE_W, STAGE_H).fill({ color: color(theme, 'panel', k.ground) });
  for (let i = 0; i < 5; i++)
    roundRect(g, 6 + i * 77, 226, 70, 432, [6, 6, 0, 0]).stroke({ width: 2, color: color(theme, 'panelLine', k.line) });
  // Wallpaper with a diamond pattern behind the header and back bar.
  g.rect(0, 59, STAGE_W, 152).fill({ color: color(theme, 'wall', k.surfaceAlt) });
  const pattern = color(theme, 'wallPattern', k.line);
  for (let y = 70; y < 205; y += 26)
    for (let x = (y / 26) % 2 ? 9 : 22; x < STAGE_W; x += 26)
      g.poly([x, y - 5, x + 5, y, x, y + 5, x - 5, y]).fill({ color: pattern });
  // Fascia: "Free House" sign board.
  g.rect(0, 0, STAGE_W, 56).fill({ color: color(theme, 'fascia', k.surface) });
  g.rect(0, 56, STAGE_W, 3).fill({ color: brass });
  g.rect(64, 27, 54, 2).fill({ color: brass });
  g.rect(272, 27, 54, 2).fill({ color: brass });
  // Dartboard.
  g.circle(51, 157, 28).fill({ color: '#1A1A1A' });
  g.circle(51, 157, 22).fill({ color: color(theme, 'dartRed', '#C8242E') });
  g.circle(51, 157, 15).fill({ color: '#1A1A1A' });
  g.circle(51, 157, 9).fill({ color: color(theme, 'dartGreen', '#1F5C44') });
  g.circle(51, 157, 4).fill({ color: color(theme, 'dartRed', '#C8242E') });
  // Beer pumps with clips in the colours of the first drinks.
  theme.drinks.slice(0, 4).forEach((d, i) => {
    const x = 123 + i * 48;
    roundRect(g, x - 6, 134, 12, 36, [6, 6, 2, 2]).fill({ color: color(theme, 'pumpHandle', '#2B1D16') });
    g.roundRect(x - 13, 168, 26, 20, 3)
      .fill({ color: color(theme, 'fascia', k.surface) })
      .stroke({ width: 2, color: brass });
    g.circle(x, 178, 5).fill({ color: d.color });
    g.rect(x - 3, 188, 6, 10).fill({ color: brass });
  });
  // Framed picture.
  g.rect(306, 126, 62, 62).fill({ color: brass });
  g.rect(310, 130, 54, 54).fill({ color: color(theme, 'fascia', k.surface) });
  g.poly([322, 184, 330, 166, 336, 172, 342, 158, 352, 184]).fill({ color: '#C9752E' });
  g.rect(0, 198, STAGE_W, 12).fill({ color: color(theme, 'shelf', k.counterTop) });
  g.rect(0, 198, STAGE_W, 2).fill({ color: brass });
  counter(g, theme, brass, 3);
  c.addChild(g);
  const sign = new Text({
    text: 'FREE HOUSE',
    style: { fontFamily: theme.fonts.display, fontWeight: '700', fontSize: 13, letterSpacing: 5, fill: brass },
  });
  sign.anchor.set(0.5);
  sign.position.set(STAGE_W / 2 + 3, 28);
  c.addChild(sign);
}

function newYorkDecor(c: Container, theme: Theme): void {
  const k = theme.colors;
  const gold = color(theme, 'brass', k.accent);
  const g = new Graphics();
  g.rect(0, 0, STAGE_W, STAGE_H).fill({ color: k.ground });
  // Zigzag band.
  g.rect(0, 0, STAGE_W, 56).fill({ color: k.surfaceAlt });
  g.moveTo(0, 40);
  for (let x = 0; x <= STAGE_W; x += 25) g.lineTo(x + 12.5, 17).lineTo(x + 25, 40);
  g.stroke({ width: 2, color: gold });
  g.rect(0, 47, STAGE_W, 1).fill({ color: k.glassRim });
  g.rect(0, 56, STAGE_W, 2).fill({ color: gold });
  // Sunburst behind the back bar.
  const cx = STAGE_W / 2;
  const cy = 202;
  for (let a = 8; a <= 172; a += 9) {
    const r = (a * Math.PI) / 180;
    g.moveTo(cx, cy).lineTo(cx - Math.cos(r) * 175, cy - Math.sin(r) * 95);
  }
  g.stroke({ width: 1, color: gold, alpha: 0.35 });
  g.arc(cx, cy, 60, Math.PI, 0).stroke({ width: 2, color: gold });
  g.arc(cx, cy, 35, Math.PI, 0).stroke({ width: 1.5, color: gold, alpha: 0.6 });
  // Bottles with gold caps.
  const bottle = (x: number, h: number) => {
    roundRect(g, x, 196 - h, 16, h, [8, 8, 2, 2]).fill({ color: color(theme, 'shelfBottle', '#1E1E1E') });
    roundRect(g, x, 196 - h, 16, 6, [8, 8, 0, 0]).fill({ color: gold });
  };
  [
    [24, 54],
    [50, 40],
    [80, 58],
    [294, 56],
    [320, 40],
    [350, 48],
  ].forEach(([x, h]) => bottle(x!, h!));
  g.rect(14, 196, STAGE_W - 28, 4).fill({ color: gold });
  // Counter: gold edge over dark stone with a soft wave.
  g.rect(0, COUNTER_TOP, STAGE_W, 2).fill({ color: gold });
  g.rect(0, COUNTER_TOP + 2, STAGE_W, 22).fill({ color: k.counterTop });
  g.moveTo(0, COUNTER_TOP + 16)
    .bezierCurveTo(130, COUNTER_TOP + 6, 260, COUNTER_TOP + 22, STAGE_W, COUNTER_TOP + 10)
    .stroke({ width: 1, color: k.glassRim, alpha: 0.6 });
  g.rect(0, COUNTER_TOP + 24, STAGE_W, STAGE_H - COUNTER_TOP - 24).fill({ color: k.counterFront });
  c.addChild(g);
}
