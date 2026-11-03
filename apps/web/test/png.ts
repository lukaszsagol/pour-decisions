import fs from 'node:fs';
import zlib from 'node:zlib';

/** Minimal PNG reader for tests: 8-bit RGB or RGBA, not interlaced. Returns #RRGGBB per pixel (null if transparent). */
export function readPng(file: string): { w: number; h: number; at: (x: number, y: number) => string | null } {
  const buf = fs.readFileSync(file);
  let pos = 8;
  let w = 0;
  let h = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0) throw new Error('Only 8-bit, non-interlaced PNGs');
      colorType = data[9]!;
    } else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!bpp) throw new Error(`Unsupported PNG colour type ${colorType}`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]!;
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x]!;
      const a = x >= bpp ? out[y * stride + x - bpp]! : 0;
      const b = y > 0 ? out[(y - 1) * stride + x]! : 0;
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp]! : 0;
      let pred = 0;
      if (f === 1) pred = a;
      else if (f === 2) pred = b;
      else if (f === 3) pred = (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = (v + pred) & 255;
    }
  }
  const hex = (n: number) => n.toString(16).toUpperCase().padStart(2, '0');
  return {
    w,
    h,
    at: (x, y) => {
      const i = y * stride + x * bpp;
      if (bpp === 4 && out[i + 3] === 0) return null;
      return `#${hex(out[i]!)}${hex(out[i + 1]!)}${hex(out[i + 2]!)}`;
    },
  };
}
