import { createRng } from '@pour/engine';
import type { Theme } from '@pour/themes';
import { Container, Graphics, Text } from 'pixi.js';
import { dashedLine } from '../pixi-util.js';
import { STAGE_W } from '../stage.js';
import { color } from '../theme-css.js';
import { pathX, type MapLayout } from './path.js';

/** Colours of a map world, from the theme with sensible fallbacks. */
export interface MapPalette {
  ground: string;
  bank: string;
  path: string;
  pathLine: string;
  buildings: string[];
  window: string;
  lamp: string;
  pole: string;
  bridge: string;
  bridgeTop: string;
  moon: string;
  fog?: string;
}

export function mapPalette(theme: Theme): MapPalette {
  const k = theme.colors;
  return {
    ground: color(theme, 'mapGround', k.ground),
    bank: color(theme, 'mapBank', k.line),
    path: color(theme, 'mapPath', k.surface),
    pathLine: color(theme, 'mapPathLine', k.muted),
    buildings: [
      color(theme, 'mapBuildingA', k.surface),
      color(theme, 'mapBuildingB', k.surfaceAlt),
      color(theme, 'mapBuildingC', k.line),
    ],
    window: color(theme, 'mapWindow', k.starDone),
    lamp: color(theme, 'lamp', k.starDone),
    pole: color(theme, 'mapPole', '#1A1A1A'),
    bridge: color(theme, 'mapBridge', k.counterTop),
    bridgeTop: color(theme, 'mapBridgeTop', k.line),
    moon: color(theme, 'mapMoon', k.text),
    fog: color(theme, 'mapFog', '#B9C4BE'),
  };
}

/** Samples the path as a polyline from bottom to top. */
function pathPoints(layout: MapLayout): number[] {
  const pts: number[] = [];
  for (let y = layout.height + 40; y >= 60; y -= 8) pts.push(pathX(y, layout.height), y);
  return pts;
}

function strokePath(g: Graphics, pts: number[], width: number, colour: string): void {
  g.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i]!, pts[i + 1]!);
  g.stroke({ width, color: colour, cap: 'round', join: 'round' });
}

/** Rows of tall houses down both sides, with lit windows. */
function sideBuildings(g: Graphics, layout: MapLayout, p: MapPalette, seed: string): void {
  const rng = createRng(seed);
  const top = 150;
  g.rect(0, top, 64, layout.height - top).fill({ color: p.buildings[0]! });
  g.rect(STAGE_W - 64, top, 64, layout.height - top).fill({ color: p.buildings[1]! });
  for (let y = top + 40; y < layout.height - 40; y += 60 + rng.int(40)) {
    for (const x of [10, 38, STAGE_W - 52, STAGE_W - 26]) {
      if (rng.next() < 0.45) continue;
      g.rect(x, y, 10, 14).fill({ color: p.window, alpha: 0.3 + rng.next() * 0.35 });
    }
  }
}

function skyline(g: Graphics, p: MapPalette, seed: string, gables: boolean): void {
  const rng = createRng(seed);
  g.circle(322, 80, 10).fill({ color: p.moon });
  for (let i = 0; i < 7; i++) {
    const x = i * 56;
    const h = 60 + rng.int(18);
    const top = 152 - h;
    const c = p.buildings[i % p.buildings.length]!;
    if (gables && i % 3 === 0) {
      // Stepped gable.
      g.poly([
        x,
        152,
        x,
        top + h * 0.3,
        x + 11,
        top + h * 0.3,
        x + 11,
        top + h * 0.15,
        x + 22,
        top + h * 0.15,
        x + 22,
        top,
        x + 32,
        top,
        x + 32,
        top + h * 0.15,
        x + 43,
        top + h * 0.15,
        x + 43,
        top + h * 0.3,
        x + 54,
        top + h * 0.3,
        x + 54,
        152,
      ]).fill({ color: c });
    } else if (gables && i % 3 === 1) {
      g.poly([x, 152, x, top + h * 0.25, x + 27, top, x + 54, top + h * 0.25, x + 54, 152]).fill({ color: c });
    } else {
      g.rect(x, top + 6, 54, h - 6).fill({ color: c });
    }
    g.rect(x + 15, top + h * 0.45, 10, 14).fill({ color: p.window, alpha: 0.7 });
    g.rect(x + 30, top + h * 0.45, 10, 14).fill({ color: p.window, alpha: 0.35 });
  }
}

function lamps(g: Graphics, layout: MapLayout, p: MapPalette): void {
  let left = true;
  for (let y = layout.height - 200; y > 200; y -= 300) {
    const x = left ? 78 : 300;
    g.rect(x, y + 12, 4, 46).fill({ color: p.pole });
    g.roundRect(x - 5, y, 14, 14, 3).fill({ color: p.lamp });
    left = !left;
  }
}

/** A brick bridge across the canal: the landmark between bars. */
function bridge(g: Graphics, y: number, p: MapPalette, water: string): void {
  g.roundRect(70, y - 12, 250, 24, 2).fill({ color: p.bridge });
  g.rect(70, y - 12, 250, 4).fill({ color: p.bridgeTop });
  for (let x = 76; x <= 314; x += 14) g.rect(x, y - 20, 3, 10).fill({ color: p.bridgeTop });
  const cx = 195;
  g.roundRect(cx - 35, y + 4, 70, 12, 6).fill({ color: water });
}

/** Draws the whole map world for a city. Scroll it by moving the container. */
export function drawMapWorld(theme: Theme, layout: MapLayout): Container {
  const c = new Container();
  const g = new Graphics();
  const p = mapPalette(theme);
  g.rect(0, 0, STAGE_W, layout.height).fill({ color: p.ground });
  sideBuildings(g, layout, p, `${theme.id}-sides`);
  skyline(g, p, `${theme.id}-sky`, theme.id === 'amsterdam');
  const pts = pathPoints(layout);
  strokePath(g, pts, 76, p.bank);
  strokePath(g, pts, 56, p.path);
  // Dashed centre line: ripples on the canal, road markings elsewhere.
  for (let i = 0; i + 3 < pts.length; i += 6)
    dashedLine(g, pts[i]!, pts[i + 1]!, pts[i + 2]!, pts[i + 3]!, 10, 6, { width: 2, color: p.pathLine, alpha: 0.7 });
  lamps(g, layout, p);
  for (const y of layout.gates) bridge(g, y, p, p.path);
  c.addChild(g);
  extras[theme.id]?.(c, theme, layout, p);
  return c;
}

type Extra = (c: Container, theme: Theme, layout: MapLayout, p: MapPalette) => void;

/** City details on top of the shared map: fog, phone boxes, towers, neon, lanterns, rain. */
const extras: Partial<Record<string, Extra>> = {
  london(c, theme, layout, p) {
    const g = new Graphics();
    const rng = createRng('london-fog');
    for (let y = 300; y < layout.height - 200; y += 260 + rng.int(160)) {
      const left = rng.next() < 0.5;
      g.roundRect(left ? -40 : 80, y, 360, 56, 28).fill({ color: p.fog ?? '#B9C4BE', alpha: 0.08 });
    }
    for (let y = layout.height - 420; y > 300; y -= 900) {
      g.roundRect(334, y, 30, 62, 4).fill({ color: '#C8242E' });
      for (const dy of [10, 26]) for (const dx of [6, 17]) g.rect(334 + dx, y + dy, 8, 12).fill({ color: '#E8A07A' });
    }
    for (let y = layout.height - 900; y > 300; y -= 900) {
      g.rect(330, y, 38, 4).fill({ color: theme.colors.accent });
      g.rect(334, y + 4, 30, 40)
        .fill({ color: theme.colors.surfaceAlt })
        .stroke({ width: 2, color: theme.colors.accent });
      g.roundRect(343, y + 14, 12, 20, 4).fill({ color: '#F6E3A6' });
    }
    c.addChild(g);
  },
  newyork(c, theme, layout) {
    const g = new Graphics();
    const gold = theme.colors.accent;
    // Gold pinstripes on the towers down both sides.
    for (const x of [18, 34, 50, STAGE_W - 50, STAGE_W - 34, STAGE_W - 18])
      g.rect(x, 160, 2, layout.height - 160).fill({ color: gold, alpha: 0.35 });
    for (let y = layout.height - 650; y > 300; y -= 1100) {
      g.rect(330, y, 46, 60).fill({ color: theme.colors.ground }).stroke({ width: 2.5, color: gold });
      for (let x = 336; x < 372; x += 6) {
        g.circle(x, y + 7, 1.2).fill({ color: gold });
        g.circle(x, y + 53, 1.2).fill({ color: gold });
      }
      const t = new Text({
        text: 'JAZZ',
        style: { fontFamily: theme.fonts.display, fontSize: 12, fill: theme.colors.hard },
      });
      t.anchor.set(0.5);
      t.position.set(353, y + 30);
      c.addChild(t);
    }
    c.addChildAt(g, 1);
  },
  tokyo(c, theme, layout) {
    const g = new Graphics();
    const rng = createRng('tokyo-rain');
    for (let i = 0; i < layout.height / 40; i++) {
      const x = rng.int(STAGE_W);
      const y = rng.int(layout.height);
      g.moveTo(x, y).lineTo(x - 3, y + 14);
    }
    g.stroke({ width: 1.5, color: theme.colors.hint, alpha: 0.25 });
    let left = true;
    for (let y = layout.height - 300; y > 200; y -= 230) {
      const x = left ? 82 : 312;
      g.rect(x - 1, y - 14, 2, 10).fill({ color: '#3A2A2A' });
      g.roundRect(x - 11, y - 4, 22, 30, 11).fill({ color: '#E0453A' });
      left = !left;
    }
    c.addChild(g);
    const signs: [string, string, number][] = [
      ['酒場', theme.colors.accent, 20],
      ['居酒屋', theme.colors.starDone, 346],
      ['歌', theme.colors.hint, 20],
    ];
    let i = 0;
    for (let y = layout.height - 500; y > 300; y -= 420) {
      const [word, tint, x] = signs[i++ % signs.length]!;
      const h = word.length * 30 + 14;
      const box = new Graphics()
        .roundRect(x, y, 30, h, 4)
        .fill({ color: theme.colors.ground })
        .stroke({ width: 2.5, color: tint });
      c.addChild(box);
      [...word].forEach((ch, j) => {
        const t = new Text({
          text: ch,
          style: { fontFamily: 'Zen Kaku Gothic New', fontWeight: '700', fontSize: 17, fill: tint },
        });
        t.anchor.set(0.5);
        t.position.set(x + 15, y + 22 + j * 30);
        c.addChild(t);
      });
    }
  },
};
