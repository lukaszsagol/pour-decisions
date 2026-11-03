import type { Theme } from '@pour/themes';
import { Container, Graphics, Text } from 'pixi.js';
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

  // Shelf plank.
  g.roundRect(14, 194, STAGE_W - 28, 6, 2).fill({ color: color(theme, 'shelf', k.line) });
  counter(g, theme, color(theme, 'brass', '#C9A24A'), 4);
  c.addChild(g);
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
