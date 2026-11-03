/** Colour maths for checking that drinks are easy to tell apart. */

export interface Lab {
  L: number;
  a: number;
  b: number;
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Not a #rrggbb colour: ${hex}`);
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** sRGB (D65) to CIE L*a*b*. */
export function hexToLab(hex: string): Lab {
  const lin = hexToRgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const [r, g, bl] = lin;
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * bl) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * bl;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * bl) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** CIEDE2000 colour difference (Sharma et al. 2005). */
export function deltaE2000(c1: Lab, c2: Lab): number {
  const C1 = Math.hypot(c1.a, c1.b);
  const C2 = Math.hypot(c2.a, c2.b);
  const Cbar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));
  const a1 = (1 + G) * c1.a;
  const a2 = (1 + G) * c2.a;
  const C1p = Math.hypot(a1, c1.b);
  const C2p = Math.hypot(a2, c2.b);
  const h = (b: number, a: number) => {
    if (a === 0 && b === 0) return 0;
    const v = deg(Math.atan2(b, a));
    return v >= 0 ? v : v + 360;
  };
  const h1 = h(c1.b, a1);
  const h2 = h(c2.b, a2);
  const dL = c2.L - c1.L;
  const dC = C2p - C1p;
  let dh = 0;
  if (C1p * C2p !== 0) {
    dh = h2 - h1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dh / 2));
  const Lbar = (c1.L + c2.L) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbar = h1 + h2;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1 - h2) <= 180) hbar = (h1 + h2) / 2;
    else hbar = h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2;
  }
  const T =
    1 -
    0.17 * Math.cos(rad(hbar - 30)) +
    0.24 * Math.cos(rad(2 * hbar)) +
    0.32 * Math.cos(rad(3 * hbar + 6)) -
    0.2 * Math.cos(rad(4 * hbar - 63));
  const dTheta = 30 * Math.exp(-(((hbar - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cbarp ** 7 / (Cbarp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lbar - 50) ** 2) / Math.sqrt(20 + (Lbar - 50) ** 2);
  const Sc = 1 + 0.045 * Cbarp;
  const Sh = 1 + 0.015 * Cbarp * T;
  const Rt = -Math.sin(rad(2 * dTheta)) * Rc;
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
}

export function deltaEHex(a: string, b: string): number {
  return deltaE2000(hexToLab(a), hexToLab(b));
}
