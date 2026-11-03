import { dith, mix, type PixelCanvas } from '../canvas.js';

/**
 * The round release badge (25 px: dark outline, cream ring, deep fill) with a
 * tiny drawing of the drink, ported from the reference cherry badge.
 */

/** 17×17 icon templates. Letters are tones of the drink or fixed colours (see PALETTE). */
const T: Record<string, string[]> = {
  // Two cherries on stems with a leaf (the reference drawing).
  cherries: [
    '...........LLL...',
    '.........LLllLL..',
    '........LllLLL...',
    '.......sLLLL.....',
    '......s.s........',
    '.....s...s.......',
    '....s.....s......',
    '...s.......s.....',
    '..s.........s....',
    '.rrrr.......s....',
    'rhhrrd....rrrr...',
    'rhrrrrd..rhhrrd..',
    'rrrrrrd..rhrrrrd.',
    'rrrrrdd..rrrrrrd.',
    '.rrddd...rrrrrdd.',
    '..ddd.....rrddd..',
    '...........ddd...',
  ],
  // A round fruit with a leaf (orange, lemon, plum, yuzu, lime).
  fruit: [
    '........s........',
    '........sLL......',
    '.......sLlLL.....',
    '.....rrrrrLL.....',
    '...rrrrrrrrrr....',
    '..rrhhrrrrrrrr...',
    '..rhhrrrrrrrrrd..',
    '.rrhrrrrrrrrrrd..',
    '.rrrrrrrrrrrrrd..',
    '.rrrrrrrrrrrrrd..',
    '.rrrrrrrrrrrrdd..',
    '..rrrrrrrrrrrdd..',
    '..rrrrrrrrrrddd..',
    '...rrrrrrrdddd...',
    '....rrddddddd....',
    '......ddddd......',
    '.................',
  ],
  // A cluster of berries (blackcurrant, sloe, kyoho grapes).
  berries: [
    '.......s.........',
    '.......sLL.......',
    '......sLlL.......',
    '....rrr.rrr......',
    '...rhrrdrhrrd....',
    '...rrrrdrrrrd....',
    '....ddd.ddd......',
    '..rrr.rrr.rrr....',
    '.rhrrdrhrrdrhrrd.',
    '.rrrrdrrrrdrrrrd.',
    '..ddd.ddd..ddd...',
    '....rrr.rrr......',
    '...rhrrdrhrrd....',
    '...rrrrdrrrrd....',
    '....ddd.ddd......',
    '......rrr........',
    '......ddd........',
  ],
  // A bottle with a cork and a label.
  bottle: [
    '.......kk........',
    '.......kk........',
    '.......oo........',
    '......orro.......',
    '......orro.......',
    '.....orrrro......',
    '....orhrrrdo.....',
    '....orhrrrdo.....',
    '....owwwwwwo.....',
    '....owwwwwwo.....',
    '....orhrrrdo.....',
    '....orhrrrdo.....',
    '....orhrrrdo.....',
    '....orrrrrdo.....',
    '....oddddddo.....',
    '.....oooooo......',
    '.................',
  ],
  // A stoneware kruik (jenever).
  jug: [
    '.......kk........',
    '......oCCo.......',
    '......oCCo.......',
    '.....oCCCCo......',
    '....oCCCCCCoo....',
    '...oCcCCCCCo.o...',
    '...oCcCCCCCo.o...',
    '...oCwwwwCCo.o...',
    '...oCwrrwCCoo....',
    '...oCwrrwCCo.....',
    '...oCwwwwCCo.....',
    '...oCcCCCCCo.....',
    '...oCcCCCCdo.....',
    '...oCCCCCCdo.....',
    '....oddddddo.....',
    '.....oooooo......',
    '.................',
  ],
  // A pint with a head of foam.
  pint: [
    '.................',
    '...ffffffffff....',
    '..ffwwwwwwwwff...',
    '..offwwwwwwffo...',
    '..orhrrrrrrrdo...',
    '..orhrrrrrrrdo...',
    '..orhrrrrrrrdo.o.',
    '..orhrrrrrrrdoo.o',
    '..orhrrrrrrrdo..o',
    '..orhrrrrrrrdo..o',
    '..orhrrrrrrrdoo.o',
    '..orhrrrrrrrdo.o.',
    '..orhrrrrrrrdo...',
    '..ordrrrrrrddo...',
    '..oddddddddddo...',
    '...oooooooooo....',
    '.................',
  ],
  // A cocktail coupe on a stem.
  coupe: [
    '.................',
    '.................',
    '.oooooooooooooo..',
    '.owhhrrrrrrrrdo..',
    '..orhrrrrrrrdo...',
    '...orrrrrrrdo....',
    '....orrrrrdo.....',
    '.....orrrdo......',
    '......oddo.......',
    '.......oo........',
    '.......oo........',
    '.......oo........',
    '.......oo........',
    '.....oooooo......',
    '....oooooooo.....',
    '.................',
    '.................',
  ],
  // A rocks glass with ice (whiskey drinks, tea).
  rocks: [
    '.................',
    '.................',
    '.................',
    '..o..........o...',
    '..o..........o...',
    '..owwwrrrrrrdo...',
    '..owwwrrwwwrdo...',
    '..orhrrrwwwrdo...',
    '..orhrrrrrrrdo...',
    '..orhwwwrrrrdo...',
    '..orhwwwrrrrdo...',
    '..orhrrrrrrrdo...',
    '..oddddddddddo...',
    '..oooooooooooo...',
    '.................',
    '.................',
    '.................',
  ],
  // A tall glass with bubbles (sodas, highballs).
  highball: [
    '.........LL......',
    '........LlL......',
    '...o....s...o....',
    '...o....s...o....',
    '...orrrrsrrdo....',
    '...orhrwrrrdo....',
    '...orhrrrrrdo....',
    '...orhrrrwrdo....',
    '...orhwrrrrdo....',
    '...orhrrrrrdo....',
    '...orhrrwrrdo....',
    '...orhrrrrrdo....',
    '...orhwrrrrdo....',
    '...orrrrrrrdo....',
    '...oddddddddo....',
    '...oooooooooo....',
    '.................',
  ],
  // A leaf (matcha, mint, lime).
  leaf: [
    '.................',
    '...........dddd..',
    '.........ddrrrd..',
    '.......ddrrrrrd..',
    '......drrrhhrrd..',
    '.....drrrhrrrrd..',
    '....drrrhrrrrd...',
    '....drrhrrrrrd...',
    '...drrhrrrrrd....',
    '...drhrrrrrd.....',
    '...drhrrrrd......',
    '...dhrrrdd.......',
    '...drddd.........',
    '..sd.............',
    '.s...............',
    's................',
    '.................',
  ],
  // A five-petal flower (violet, sakura, elderflower).
  flower: [
    '.................',
    '.......rrr.......',
    '......rhhrr......',
    '..rr..rhrrr..rr..',
    '.rhrr.rrrrd.rhrr.',
    '.rrrrrdyyddrrrrd.',
    '..ddrrdyyyrrrdd..',
    '.....ryyyyyr.....',
    '....rrdyyydrr....',
    '...rhrrdddrrrr...',
    '..rhrrrd..rrrrd..',
    '..rrrrd....rrrd..',
    '...ddd......dd...',
    '.................',
    '.................',
    '.................',
    '.................',
  ],
  // A banana (pisang ambon).
  banana: [
    '.................',
    '.............kk..',
    '............ss...',
    '...........rrd...',
    '..........rhrd...',
    '.........rhrrd...',
    '........rhrrd....',
    '.......rhrrrd....',
    '.....rrhrrrd.....',
    '...rrhhrrrdd.....',
    '.rrhhrrrrdd......',
    'rrhrrrrddd.......',
    'krrrdddd.........',
    '.kddd............',
    '.................',
    '.................',
    '.................',
  ],
  // A stalk of rhubarb.
  stalk: [
    '..........LLL....',
    '.........LlLLL...',
    '........LLlLLL...',
    '.........LLL.....',
    '........rd.......',
    '.......rhd.......',
    '.......rhd.......',
    '......rhrd.......',
    '......rhd........',
    '.....rhrd........',
    '.....rhd.........',
    '....rhrd.........',
    '....rhd..........',
    '...rhrd..........',
    '...rhd...........',
    '...dd............',
    '.................',
  ],
  // A crescent moon (blue moon).
  moon: [
    '.................',
    '......rrrr.......',
    '....rrhhd........',
    '...rhhrd.........',
    '..rhhrd..........',
    '..rhrd...........',
    '.rhhrd...........',
    '.rhrrd...........',
    '.rhrrd...........',
    '.rhrrrd..........',
    '..rhrrd.......d..',
    '..rrhrrd.....dd..',
    '...rrrrrdddddd...',
    '....ddrrrrrdd....',
    '......dddddd.....',
    '.................',
    '.................',
  ],
  // A melon slice.
  melon: [
    '.................',
    '.................',
    '.................',
    '.................',
    '.rrrrrrrrrrrrrrr.',
    '.rhrrkrrrrkrrrrd.',
    '..rhrrrrkrrrrrd..',
    '..rrrrrrrrrrrrd..',
    '...rrkrrrrrkrd...',
    '....rrrrrrrrd....',
    '....wwwwwwwww....',
    '.....LLLLLLL.....',
    '.......LLL.......',
    '.................',
    '.................',
    '.................',
    '.................',
  ],
};

const PALETTE = {
  s: '#9A8A42',
  L: '#2A9A58',
  l: '#8AE8AE',
  k: '#3A2A1A',
  w: '#F4F0E4',
  f: '#F4EAD4',
  y: '#F4D24A',
  C: '#D6C6A6',
  c: '#F4EAD4',
} as const;

/** Which drawing each drink gets; anything missing falls back to a small glass of its colour. */
export const DRINK_ICONS: Record<string, keyof typeof T> = {
  // Amsterdam
  cherry: 'cherries',
  jenever: 'jug',
  'jonge-jenever': 'jug',
  advocaat: 'fruit',
  oranjebitter: 'fruit',
  curacao: 'bottle',
  bessenjenever: 'berries',
  'pisang-ambon': 'banana',
  'parfait-amour': 'flower',
  framboos: 'berries',
  // London
  lager: 'pint',
  bitter: 'pint',
  stout: 'pint',
  'gin-tonic': 'highball',
  blackcurrant: 'berries',
  elderflower: 'flower',
  'sloe-gin': 'berries',
  'rhubarb-gin': 'stalk',
  bramble: 'berries',
  'lime-cordial': 'leaf',
  // New York
  manhattan: 'cherries',
  cosmopolitan: 'coupe',
  aviation: 'coupe',
  'whiskey-sour': 'rocks',
  grasshopper: 'leaf',
  'dry-martini': 'coupe',
  sidecar: 'fruit',
  'long-island': 'highball',
  'clover-club': 'coupe',
  'blue-moon': 'moon',
  // Tokyo
  sakura: 'flower',
  umeshu: 'fruit',
  melon: 'melon',
  yuzu: 'fruit',
  ramune: 'bottle',
  matcha: 'leaf',
  kyoho: 'berries',
  akadama: 'bottle',
  calpis: 'highball',
  hojicha: 'rocks',
};

/** A small glass of the drink: the fallback icon. */
const GLASS_ICON = [
  '.................',
  '.................',
  '....o.......o....',
  '....o.......o....',
  '....orrrrrrdo....',
  '....orhrrrrdo....',
  '....orhrrrrdo....',
  '....orhrrrrdo....',
  '....orhrrrrdo....',
  '....orrrrrrdo....',
  '.....oddddo......',
  '.......oo........',
  '.......oo........',
  '.....oooooo......',
  '.................',
  '.................',
  '.................',
];

/** Draws the drink's icon at (x, y), 17×17. */
export function drinkIcon(cv: PixelCanvas, x: number, y: number, id: string, color: string): void {
  const tpl = T[DRINK_ICONS[id] ?? ''] ?? GLASS_ICON;
  const cherryRef = id === 'cherry';
  const pal: Record<string, string> = {
    ...PALETTE,
    r: cherryRef ? '#E0453A' : mix(color, '#FFFFFF', 0.08),
    h: cherryRef ? '#FFB8A8' : mix(color, '#FFFFFF', 0.55),
    d: cherryRef ? '#8E1A22' : mix(color, '#000000', 0.42),
    o: '#F4EAD4',
  };
  cv.sprite(x, y, tpl, pal);
}

/** Every drink id that has its own drawing. */
export const ICON_IDS = Object.keys(DRINK_ICONS);

/** The 25 px round badge with the drink's icon, at (bx, by). Port of the reference badge. */
export function releaseBadge(cv: PixelCanvas, bx: number, by: number, id: string, color: string): void {
  const R = 12;
  const exact = id === 'cherry';
  const outline = exact ? '#3A0A12' : mix(color, '#000000', 0.66);
  const fill = exact ? '#5E1020' : mix(color, '#000000', 0.44);
  const fillHi = exact ? '#6E1828' : mix(color, '#000000', 0.35);
  for (let j = 0; j < 25; j++) {
    for (let i = 0; i < 25; i++) {
      const d = Math.hypot(i - R, j - R);
      if (d > R + 0.5) continue;
      let col: string;
      if (d > R - 0.8) col = outline;
      else if (d > R - 2.2) col = i + j < 30 ? '#F3E6CC' : '#C9B48E';
      else {
        col = fill;
        if (j < 9 && dith(bx + i, by + j, 0.35)) col = fillHi;
      }
      cv.px(bx + i, by + j, col);
    }
  }
  drinkIcon(cv, bx + 4, by + 4, id, color);
}
