import { mix, pack } from './canvas.js';

/** Liquid tones per drink: base, light surface, dark edge, specular. */
export interface LiquidTones {
  base: string;
  hi: string;
  dk: string;
  spec: string;
}

/** Exact tones from the reference `DRINKS` table (Amsterdam). */
const REFERENCE: Record<string, LiquidTones> = {
  jenever: { base: '#8C5A22', hi: '#B47A38', dk: '#5E3C0E', spec: '#E0AA60' },
  advocaat: { base: '#F0CF3E', hi: '#FFE98A', dk: '#C49E1A', spec: '#FFF8D8' },
  cherry: { base: '#A8213A', hi: '#D04A60', dk: '#6A0E1E', spec: '#F69AA8' },
  oranjebitter: { base: '#F28C28', hi: '#FFB25E', dk: '#B85A0C', spec: '#FFDCB0' },
  curacao: { base: '#3E6FC4', hi: '#6E9AE6', dk: '#1E4488', spec: '#B8D2F8' },
};

function toHsl(hex: string): [number, number, number] {
  const p = pack(hex);
  const r = ((p >> 16) & 255) / 255;
  const g = ((p >> 8) & 255) / 255;
  const b = (p & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h /= 6;
  return [h, s, l];
}

function fromHsl(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return `#${[f(0), f(8), f(4)].map((v) => Math.max(0, Math.min(255, v)).toString(16).toUpperCase().padStart(2, '0')).join('')}`;
}

/** Shifts a hue towards yellow (light) or blue (shadow), as hand-shaded pixel art does. */
function shiftHue(h: number, toward: number, amount: number): number {
  let d = toward - h;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return (h + d * amount + 1) % 1;
}

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

/**
 * The four liquid tones for a drink: the reference table where it has the
 * drink, otherwise derived from the base colour with the same ratios (lighter
 * and warmer for the light, darker, richer and cooler for the dark).
 */
export function liquidTones(id: string, base: string): LiquidTones {
  const ref = REFERENCE[id];
  if (ref) return ref;
  const [h, s, l] = toHsl(base);
  const grey = s < 0.08;
  return {
    base,
    hi: fromHsl(grey ? h : shiftHue(h, 1 / 6, 0.08), clamp(s * 1.05), clamp(l + 0.12, 0, 0.92)),
    dk: fromHsl(grey ? h : shiftHue(h, 2 / 3, 0.06), clamp(s * 1.15 + 0.05), clamp(l - 0.17, 0.06)),
    spec: mix(fromHsl(h, clamp(s * 0.9), clamp(l + 0.3, 0, 0.95)), '#FFFFFF', 0.25),
  };
}

/** Rim tones (light, base, dark) for a selection or highlight colour. */
export function rimTones(c: string): { rl: string; rb: string; rd: string } {
  return { rl: mix(c, '#FFFFFF', 0.45), rb: c, rd: mix(c, '#000000', 0.45) };
}
