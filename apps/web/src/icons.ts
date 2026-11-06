/**
 * Pixel icons: sprites on the art grid (each cell 2 or 4 logical px, i.e.
 * whole art pixels), drawn as crisp SVG rectangles. `#` takes the colour passed in; `o` is a darker
 * outline or shade of it. Function names match the earlier vector icons.
 */

type Rows = readonly string[];

function shade(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.round(((n >> s) & 255) * 0.55);
  return `#${[c(16), c(8), c(0)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** An SVG of a sprite: each character is a cell of `cell` px. Runs of one colour merge into one rect. */
export function pixelSvg(rows: Rows, pal: Record<string, string>, cell = 2): string {
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const rects: string[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x]!;
      const fill = pal[ch];
      if (!fill) {
        x++;
        continue;
      }
      let end = x;
      while (end + 1 < row.length && row[end + 1] === ch) end++;
      rects.push(`<rect x="${x}" y="${y}" width="${end - x + 1}" height="1" fill="${fill}"/>`);
      x = end + 1;
    }
  });
  return `<svg width="${w * cell}" height="${h * cell}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${rects.join('')}</svg>`;
}

const sprite = (rows: Rows, c: string, cell = 2) => pixelSvg(rows, { '#': c, o: shade(c), w: '#FFFFFF' }, cell);

export const SPRITES = {
  back: ['....##', '...##.', '..##..', '.##...', '##....', '.##...', '..##..', '...##.', '....##'],
  // A ring with an arrowhead on its right end, pointing up: "go round again".
  restart: [
    '....####.....',
    '...#####..#..',
    '..###....###.',
    '.###....#####',
    '.##.......##.',
    '.##.......##.',
    '.##.......##.',
    '.###.....###.',
    '..###...###..',
    '...#######...',
    '....#####....',
  ],
  undo: [
    '...#.........',
    '..##.........',
    '.###.........',
    '############.',
    '.###.......#.',
    '..##.......#.',
    '...#.......#.',
    '...........#.',
    '.....######..',
  ],
  glass: [
    '#.........#',
    '#.........#',
    '#....#....#',
    '#....#....#',
    '#..#####..#',
    '#....#....#',
    '.#...#...#.',
    '.#.......#.',
    '..#######..',
  ],
  hint: [
    '...#####...',
    '.##.....##.',
    '#.........#',
    '#.........#',
    '.#.......#.',
    '..#.....#..',
    '...#####...',
    '...#####...',
    '....###....',
  ],
  share: [
    '....#....',
    '...###...',
    '..#####..',
    '....#....',
    '....#....',
    '#...#...#',
    '#.......#',
    '#.......#',
    '#########',
  ],
  star: [
    '......#......',
    '.....###.....',
    '.....###.....',
    '....##o##....',
    '#############',
    '.###########.',
    '..#########..',
    '...#######...',
    '...###.###...',
    '..###...###..',
    '..##.....##..',
    '.#.........#.',
  ],
  gear: [
    '....##....',
    '.#.####.#.',
    '.########.',
    '..##..##..',
    '###....###',
    '###....###',
    '..##..##..',
    '.########.',
    '.#.####.#.',
    '....##....',
  ],
  lock: ['..####..', '.#....#.', '.#....#.', '########', '###..###', '###..###', '####.###', '########'],
  map: ['##...##..', '#.###.###', '#.#.#.#.#', '#.#.#.#.#', '#.#.#.#.#', '#.#.#.#.#', '###.###.#', '..##...##'],
  daily: [
    '.#.....#.',
    '#########',
    '#.......#',
    '#########',
    '#.#.#.#.#',
    '#.......#',
    '#.#.#.#.#',
    '#.......#',
    '#########',
  ],
  passport: ['#######', '#.....#', '#.###.#', '#.#.#.#', '#.###.#', '#.....#', '#.###.#', '#.....#', '#######'],
  family: [
    '.##....##.',
    '####..####',
    '####..####',
    '.##....##.',
    '..........',
    '.####.####',
    '##########',
    '##########',
  ],
  book: [
    '.###..###.',
    '#...##...#',
    '#.##..##.#',
    '#...##...#',
    '#.##..##.#',
    '#...##...#',
    '#.##..##.#',
    '####..####',
    '...####...',
  ],
  coin: ['..####..', '.#....#.', '#..##..#', '#.#..#.#', '#.#..#.#', '#..##..#', '.#....#.', '..####..'],
} as const;

export const icons = {
  back: (c: string) => sprite(SPRITES.back, c, 2),
  restart: (c: string) => sprite(SPRITES.restart, c, 2),
  undo: (c: string, _w?: number) => sprite(SPRITES.undo, c, 2),
  glass: (c: string, _w?: number) => sprite(SPRITES.glass, c, 2),
  hint: (c: string, _w?: number) => sprite(SPRITES.hint, c, 2),
  share: (c: string) => sprite(SPRITES.share, c, 2),
  /** A shaded pixel star; `size` is the drawn width in px. */
  star: (c: string, size = 16) => pixelSvg(SPRITES.star, { '#': c, o: shade(c) }, size >= 40 ? 4 : 2),
  gear: (c: string) => sprite(SPRITES.gear, c, 2),
  lock: (c: string) => sprite(SPRITES.lock, c, 2),
  coin: (c: string) => sprite(SPRITES.coin, c, 2),
  tab: (name: 'map' | 'daily' | 'passport' | 'family' | 'book', c: string) => sprite(SPRITES[name], c, 2),
};

/** Escapes text for use inside HTML. */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
}
