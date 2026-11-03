import { createRng } from '@pour/engine';
import type { Theme } from '@pour/themes';
import { Container, Graphics } from 'pixi.js';
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
}

export function mapPalette(theme: Theme): MapPalette {
  const k = theme.colors;
  return {
    ground: k.ground,
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
  return c;
}
