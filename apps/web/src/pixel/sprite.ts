import { pack, PixelCanvas } from './canvas.js';

/** Loads a bundled pixel-art PNG into a PixelCanvas (transparent pixels stay transparent). */
export async function loadSprite(url: string): Promise<PixelCanvas> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext('2d')!;
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  const cv = new PixelCanvas(c.width, c.height);
  const hex = (v: number) => v.toString(16).padStart(2, '0');
  for (let i = 0; i < cv.data.length; i++)
    if (d[i * 4 + 3]! > 127) cv.data[i] = pack(`#${hex(d[i * 4]!)}${hex(d[i * 4 + 1]!)}${hex(d[i * 4 + 2]!)}`);
  return cv;
}
