# Reference drawing code for the pixel-art Amsterdam level (Python). The output paths are from the design session; read it as a spec for shapes, colours and shading, and port the routines to TypeScript.

import sys, math
sys.path.insert(0, '/home/claude/gen')
from pixel import Canvas

W, H, S = 195, 422, 2
cv = Canvas(W, H, '#2A1A10')
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def hx(c):
    return tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))


def mix(a, b, t):
    A, B = hx(a), hx(b)
    return '#%02X%02X%02X' % tuple(round(A[i] + (B[i] - A[i]) * t) for i in range(3))


def dith(x, y, t):
    return t * 16 > BAYER[y % 4][x % 4] + 0.5


def get(x, y):
    return cv.g[y][x] if 0 <= x < W and 0 <= y < H else None


def tint(x, y, toward, t):
    c = get(x, y)
    if c:
        cv.px(x, y, mix(c, toward, t))


def shadow_box(x, y, w, h, t=0.5, strength=0.4):
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            if dith(xx, yy, t):
                tint(xx, yy, '#000000', strength)


DIG = {
    '0': ['.##.', '#..#', '#..#', '#..#', '#..#', '#..#', '.##.'],
    '1': ['.#..', '##..', '.#..', '.#..', '.#..', '.#..', '###.'],
    '2': ['.##.', '#..#', '...#', '..#.', '.#..', '#...', '####'],
    '3': ['###.', '...#', '...#', '.##.', '...#', '...#', '###.'],
    '4': ['#..#', '#..#', '#..#', '####', '...#', '...#', '...#'],
    '5': ['####', '#...', '###.', '...#', '...#', '#..#', '.##.'],
}

# ---------- wall ----------
PW = 19
for i, x in enumerate(range(0, W, PW)):
    base = ['#2C1B11', '#291910'][i % 2]
    cv.rect(x, 27, PW, 292, base)
    cv.vline(x, 27, 292, '#1A0F08')
    cv.vline(x + 1, 27, 292, mix(base, '#5A3A24', 0.35))
    cv.vline(x + PW - 1, 27, 292, mix(base, '#120A05', 0.45))
    seed = i * 7 + 3
    for k in range(14):
        gy = 34 + ((seed * 37 + k * 53) % 280)
        gx = x + 4 + ((seed + k * 5) % 11)
        ln = 4 + (k * 7 + seed) % 9
        cv.vline(gx, gy, ln, mix(base, '#120A05', 0.35))
        cv.vline(gx + 1, gy + 1, max(1, ln - 3), mix(base, '#5A3A24', 0.18))
    for k in range(3):
        ky = 60 + ((seed * 71 + k * 97) % 240)
        kx = x + 6 + (seed * 3 + k * 4) % 7
        cv.sprite(kx, ky, ['.##.', '#..#', '.##.'], {'#': mix(base, '#120A05', 0.45)})
for y in (150, 255):
    cv.hline(0, y, W, '#1A0F08'); cv.hline(0, y + 1, W, '#3A2516'); cv.hline(0, y + 2, W, '#24160D')

LX, LY = 97, 80
for y in range(27, 200):
    for x in range(W):
        d = math.hypot((x - LX) * 0.85, (y - LY) * 1.1)
        if d < 70:
            t = (1 - d / 70) ** 1.4
            lvl = t * 4
            step = int(lvl) + (1 if dith(x, y, lvl - int(lvl)) else 0)
            if step:
                tint(x, y, '#E8A33D', 0.065 * step)

# ---------- Delft tiles (flower motif, corner arcs) ----------
cv.rect(0, 0, W, 27, '#B9A586')
TB, TBD, TBL = '#2A5BA8', '#1A3E80', '#7AA2E6'
for i in range(9):
    tx = 1 + i * 23
    cv.rect(tx, 1, 22, 22, '#F3E6CC')
    cv.hline(tx, 1, 22, '#FFF9EC'); cv.vline(tx, 1, 22, '#FFF9EC')
    cv.hline(tx, 22, 22, '#D8C7A6'); cv.vline(tx + 21, 1, 22, '#D8C7A6')
    cx, cy = tx + 11, 12
    PET = ['..##..', '.####.', '.####.', '..##..']
    cv.sprite(cx - 3, cy - 7, PET, {'#': TB}); cv.sprite(cx - 3, cy + 3, PET, {'#': TB})
    cv.sprite(cx - 7, cy - 2, ['.##.', '####', '####', '.##.'][:4], {'#': TB}); cv.sprite(cx - 7, cy - 1, ['.##.', '####', '####', '.##.'], {'#': TB})
    cv.sprite(cx + 3, cy - 1, ['.##.', '####', '####', '.##.'], {'#': TB})
    cv.px(cx - 2, cy - 6, TBL); cv.px(cx - 6, cy, TBL); cv.px(cx - 2, cy + 4, TBL); cv.px(cx + 4, cy, TBL)
    cv.rect(cx - 1, cy - 1, 2, 2, TBD); cv.px(cx - 1, cy - 1, '#F3E6CC')
    for (ax, ay, sx_, sy_) in ((tx + 1, 2, 1, 1), (tx + 20, 2, -1, 1), (tx + 1, 21, 1, -1), (tx + 20, 21, -1, -1)):
        for k in range(5):
            cv.px(ax + sx_ * k, ay + sy_ * (4 - k if k < 5 else 0), TB)
        cv.px(ax, ay, TBD)
cv.hline(0, 24, W, '#8C7A60'); cv.hline(0, 25, W, '#5A3A24'); cv.hline(0, 26, W, '#3B2416')
shadow_box(0, 27, W, 3, 0.5, 0.45)

# ---------- header: back arrow and brass-framed sign ----------
ARROW = ['.....#', '....##', '...##.', '..##..', '.##...', '##....', '.##...', '..##..', '...##.', '....##', '.....#']
cv.sprite(9, 39, ARROW, {'#': '#120A05'}); cv.sprite(8, 38, ARROW, {'#': '#F3E6CC'})
sx, sy, sw, sh = 121, 32, 70, 23
shadow_box(sx + 2, sy + 2, sw, sh, 0.5, 0.5)
cv.rect(sx, sy, sw, sh, '#C9A24A')
cv.hline(sx, sy, sw, '#F4D58A'); cv.vline(sx, sy, sh, '#F4D58A')
cv.hline(sx, sy + sh - 1, sw, '#8A6A1E'); cv.vline(sx + sw - 1, sy, sh, '#8A6A1E')
cv.rect(sx + 3, sy + 3, sw - 6, sh - 6, '#22140B')
cv.hline(sx + 3, sy + 3, sw - 6, '#120A05'); cv.vline(sx + 3, sy + 3, sh - 6, '#120A05')
cv.hline(sx + 2, sy + sh - 3, sw - 4, '#A8842E')
for (px_, py_) in ((sx + 1, sy + 1), (sx + sw - 3, sy + 1), (sx + 1, sy + sh - 3), (sx + sw - 3, sy + sh - 3)):
    cv.rect(px_, py_, 2, 2, '#FFF0B8'); cv.px(px_ + 1, py_ + 1, '#8A6A1E')

# ---------- shelf, jugs, lamp ----------
STONE = ['#4E4234', '#C2B090', '#E2D4B6', '#F4EAD4', '#D6C6A6', '#C2B090', '#A8966F', '#8C7A60', '#6E604A', '#4E4234']


def jug(x, y, h):
    for c, col in enumerate(STONE):
        inset = 2 if c in (0, 9) else (1 if c in (1, 8) else 0)
        cv.vline(x + c, y + inset, h - inset, col)
    cv.hline(x + 2, y + h - 1, 6, '#6E604A'); cv.hline(x + 3, y + h - 1, 2, '#8C7A60')
    cv.hline(x + 2, y - 1, 6, '#C2B090'); cv.hline(x + 3, y - 1, 2, '#F4EAD4')
    cv.rect(x + 3, y - 5, 4, 4, '#A8966F'); cv.vline(x + 3, y - 5, 4, '#D6C6A6'); cv.vline(x + 6, y - 5, 4, '#7A6A50')
    cv.hline(x + 3, y - 6, 4, '#C2B090')
    cv.rect(x + 3, y - 8, 4, 2, '#6B4226'); cv.hline(x + 3, y - 8, 4, '#8A5A36')
    cv.vline(x + 10, y + 2, 7, '#8C7A60'); cv.vline(x + 11, y + 3, 5, '#5E5040'); cv.px(x + 10, y + 1, '#A8966F'); cv.px(x + 10, y + 9, '#6E604A')
    ly = y + h // 2 - 3
    cv.rect(x + 2, ly, 6, 6, '#F3E6CC'); cv.hline(x + 2, ly + 5, 6, '#D8C7A6'); cv.vline(x + 7, ly, 6, '#E2D2B2')
    cv.sprite(x + 3, ly + 1, ['.#..', '###.', '.#.#', '...#'], {'#': '#2A5BA8'})


for x, h in ((10, 19), (26, 15), (42, 21)):
    jug(x, 100 - h, h)
for x, h in ((130, 16), (146, 21), (162, 15)):
    jug(x, 100 - h, h)
cv.hline(0, 100, W, '#B4835A'); cv.hline(0, 101, W, '#8A5A36')
cv.rect(0, 102, W, 4, '#6B4226'); cv.hline(0, 106, W, '#3B2416'); cv.hline(0, 107, W, '#24160D')
for x in range(4, W, 13):
    cv.hline(x, 103 + (x // 13) % 2, 5, '#5A3A24')
shadow_box(0, 108, W, 6, 0.55, 0.45)
cv.vline(97, 55, 12, '#120A05')
cv.rect(94, 66, 7, 3, '#C9A24A'); cv.hline(94, 66, 7, '#F4D58A'); cv.px(100, 68, '#8A6A1E')
SHADE = ['......##########......', '....##############....', '...################...', '..##################..',
         '.####################.', '######################', '######################']
for j, row in enumerate(SHADE):
    for i, ch in enumerate(row):
        if ch == '#':
            t = i / 21
            col = '#FFD08A' if t < 0.2 else ('#F4B04A' if t < 0.45 else ('#E8A33D' if t < 0.75 else '#B87A20'))
            if j == 0:
                col = mix(col, '#FFFFFF', 0.2)
            cv.px(86 + i, 69 + j, col)
cv.hline(86, 75, 22, '#7A4A12')
cv.rect(92, 76, 11, 3, '#FFF4D0'); cv.hline(93, 79, 9, '#FFE2A8'); cv.hline(95, 80, 5, '#FFD08A')

# ---------- tulip glasses ----------
DRINKS = {
    'J': ('#8C5A22', '#B47A38', '#5E3C0E', '#E0AA60'),
    'A': ('#F0CF3E', '#FFE98A', '#C49E1A', '#FFF8D8'),
    'C': ('#A8213A', '#D04A60', '#6A0E1E', '#F69AA8'),
    'O': ('#F28C28', '#FFB25E', '#B85A0C', '#FFDCB0'),
    'U': ('#3E6FC4', '#6E9AE6', '#1E4488', '#B8D2F8'),
}
# interior width per row, rim to bottom (66 rows)
PROFILE = [20] * 6 + [21] * 4 + [22] * 48 + [22, 21, 21, 20, 19, 17, 15, 12]
UNIT = 15


def glass(x0, y0, units, selected=False, locked=False):
    if selected:
        y0 -= 7
        rl, rb, rd = '#FFC27A', '#F28C28', '#B05408'
    elif locked:
        rl, rb, rd = '#A8966F', '#7A6A50', '#4E4232'
    else:
        rl, rb, rd = '#FFF6E2', '#D8C7A6', '#8C7A60'
    cx = x0 + 13
    shadow_box(x0 + 4, y0 + 76, 20, 5, 0.5, 0.4)
    rows = []
    for r, w in enumerate(PROFILE):
        il = cx - w // 2
        ir = il + w - 1
        y = y0 + 1 + r
        rows.append((y, il, ir))
        cv.hline(il, y, w, '#1A0F08')
        cv.px(il + 1, y, '#24160D'); cv.px(ir, y, '#120A05')
    # liquids, bottom up
    n = len(PROFILE)
    for k, d in enumerate(units):
        base, hi, dk, spec = DRINKS[d]
        r_bottom = n - 1 - k * UNIT
        for rr in range(UNIT):
            r = r_bottom - (UNIT - 1 - rr)
            y, il, ir = rows[r]
            for x in range(il, ir + 1):
                c = x - il
                wdt = ir - il
                col = base
                if rr == 0:
                    col = hi
                elif rr == 1 and dith(x, y, 0.5):
                    col = hi
                elif rr >= UNIT - 2 and dith(x, y, 0.35 if rr == UNIT - 2 else 0.7):
                    col = mix(base, dk, 0.5)
                if c == 0:
                    col = mix(col, hi, 0.65)
                elif c == 1:
                    col = mix(col, hi, 0.3)
                elif c == wdt:
                    col = dk
                elif c == wdt - 1:
                    col = mix(col, dk, 0.6)
                elif c == wdt - 2 and dith(x, y, 0.5):
                    col = mix(col, dk, 0.4)
                cv.px(x, y, col)
        y, il, ir = rows[r_bottom - UNIT + 1]
        cv.hline(il + 2, y, 3, spec)
    # reflection sheen
    for r in range(2, 52):
        y, il, ir = rows[r]
        if r % 9 not in (7, 8):
            tint(il + 3, y, '#FFFFFF', 0.38 if r < 30 else 0.2)
        if 3 <= r <= 16:
            tint(il + 4, y, '#FFFFFF', 0.18)
    # walls
    for (y, il, ir) in rows:
        cv.px(il - 1, y, rb); cv.px(ir + 1, y, rd)
        cv.px(il, y, mix(get(il, y) or '#1A0F08', rl, 0.25))
    for (a, b) in zip(rows, rows[1:]):
        if b[1] > a[1]:
            cv.hline(a[1] - 1, b[0], b[1] - a[1] + 1, rb)
            cv.hline(b[2] + 1, b[0], a[2] - b[2] + 1, rd)
        if b[1] < a[1]:
            cv.hline(b[1] - 1, a[0], a[1] - b[1] + 1, rb)
            cv.hline(a[2] + 1, a[0], b[2] - a[2] + 1, rd)
    # rim lip
    y, il, ir = rows[0]
    cv.hline(il - 2, y0, ir - il + 5, rl)
    cv.px(il - 2, y0 + 1, rb); cv.px(ir + 2, y0 + 1, rd)
    cv.px(ir + 2, y0, rb)
    # base of bowl
    y, il, ir = rows[-1]
    cv.hline(il, y + 1, ir - il + 1, rd); cv.hline(il, y + 1, (ir - il) // 2, rb)
    # stem and foot
    sy0 = y + 2
    cv.vline(cx - 1, sy0, 7, rl); cv.vline(cx, sy0, 7, rb); cv.vline(cx + 1, sy0, 7, rd)
    cv.hline(cx - 2, sy0, 5, rb)
    cv.hline(cx - 8, sy0 + 7, 17, rb); cv.hline(cx - 7, sy0 + 7, 7, rl)
    cv.hline(cx - 7, sy0 + 8, 15, rd)
    cv.hline(cx - 6, sy0 + 9, 13, mix(rd, '#000000', 0.3))
    return y0


row1, row2 = 117, 228
for x0, u, sel in ((26, 'JCAU', False), (65, 'OJUC', True), (104, 'AOCJ', False), (143, 'UAJO', False)):
    glass(x0, row1, u, selected=sel)
glass(46, row2, 'CUOA')
glass(85, row2, '', locked=True)
glass(124, row2, '')

# ---------- locked glass: chains, padlock, cherry badge ----------
x0, y0 = 85, row2
cx = x0 + 13
LINK_A = ['.###.', '#...#', '.###.']
LINK_B = ['###', '###']


def chain(ax, ay, bx, by):
    n = max(abs(bx - ax), abs(by - ay))
    steps = int(n / 4)
    for s_ in range(steps + 1):
        t = s_ / steps
        x, y = round(ax + (bx - ax) * t), round(ay + (by - ay) * t)
        if s_ % 2 == 0:
            cv.sprite(x - 1, y, LINK_A, {'#': '#4E3A0C'})
            cv.sprite(x - 2, y - 1, LINK_A, {'#': '#C9A24A'})
            cv.px(x - 1, y - 1, '#F4D58A'); cv.px(x, y - 1, '#F4D58A'); cv.px(x + 1, y + 1, '#8A6A1E')
        else:
            cv.sprite(x, y + 1, LINK_B, {'#': '#4E3A0C'})
            cv.sprite(x - 1, y, LINK_B, {'#': '#A8842E'})
            cv.px(x - 1, y, '#E6C26A'); cv.px(x + 1, y + 1, '#7A5A14')


RING = ['.###.', '#...#', '#...#', '#...#', '.###.']


def chain45(sx, sy, dirx, n):
    """Continuous chain at 45 degrees: rings joined by short diagonal links."""
    for k in range(n):
        rx, ry = sx + dirx * 6 * k, sy + 6 * k
        ox = rx if dirx > 0 else rx - 4
        cv.sprite(ox + 1, ry + 1, RING, {'#': '#3A2A08'})
        for j, row in enumerate(RING):
            for i, ch in enumerate(row):
                if ch == '#':
                    col = '#C9A24A'
                    if i + j <= 3:
                        col = '#F4D58A'
                    elif i + j >= 6:
                        col = '#8A6A1E'
                    cv.px(ox + i, ry + j, col)
        if k < n - 1:
            for t in range(3):
                bx_ = (ox + 4 + t) if dirx > 0 else (ox - t)
                cv.px(bx_ + 1, ry + 5 + t, '#3A2A08')
                cv.px(bx_, ry + 4 + t, '#A8842E' if t != 1 else '#E6C26A')


chain45(x0 - 3, y0 + 10, 1, 6)
chain45(x0 + 29, y0 + 10, -1, 6)
for y in range(y0 - 3, y0 + 25, 4):
    if (y // 4) % 2:
        cv.sprite(cx - 2, y, ['.#.', '#.#', '#.#', '.#.'], {'#': '#C9A24A'}); cv.px(cx - 1, y, '#F4D58A')
    else:
        cv.rect(cx - 1, y, 2, 4, '#A8842E'); cv.px(cx - 1, y, '#E6C26A')
LOCK = [
    '....########....',
    '...##......##...',
    '..##........##..',
    '..#..........#..',
    '..#..........#..',
    '..#..........#..',
    '..#..........#..',
    'oooooooooooooooo',
    'oBBBBBBBBBBBBBBo',
    'oBbbbbbbbbbbbbdo',
    'oBbbbbbKKbbbbbdo',
    'oBbbbbKKKKbbbbdo',
    'oBbbbbbKKbbbbbdo',
    'oBbbbbbKKbbbbbdo',
    'oBbbbbbKKbbbbbdo',
    'oBbbbbbbbbbbbbdo',
    'oBddddddddddddDo',
    'oooooooooooooooo',
]
lx, ly = cx - 8, y0 + 22
shadow_box(lx + 2, ly + 9, 16, 11, 0.6, 0.5)
LP = {'#': '#B8BCC0', 'o': '#4E3A0C', 'B': '#F4D58A', 'b': '#C9A24A', 'd': '#9A7424', 'D': '#6E5414', 'K': '#1A0F08'}
for j, row in enumerate(LOCK):
    for i, ch in enumerate(row):
        if ch in LP:
            col = LP[ch]
            if ch == 'b' and j >= 13:
                col = '#B89038'
            cv.px(lx + i, ly + j, col)
cv.vline(lx + 2, ly + 3, 4, '#F2F4F6'); cv.vline(lx + 3, ly + 2, 1, '#F2F4F6'); cv.hline(lx + 4, ly, 4, '#F2F4F6')
cv.vline(lx + 13, ly + 3, 4, '#7A8086'); cv.px(lx + 12, ly + 2, '#7A8086')
cv.rect(lx + 2, ly + 9, 2, 2, '#FFF6D8')
cv.px(lx + 7, ly + 10, '#3A2A1A')
# badge
bx, by, R = cx - 12, y0 - 28, 12
for j in range(25):
    for i in range(25):
        d = math.hypot(i - R, j - R)
        if d <= R + 0.5:
            if d > R - 0.8:
                col = '#3A0A12'
            elif d > R - 2.2:
                col = '#F3E6CC' if (i + j) < 30 else '#C9B48E'
            else:
                col = '#5E1020'
                if j < 9 and dith(bx + i, by + j, 0.35):
                    col = '#6E1828'
            cv.px(bx + i, by + j, col)
CHERRY = [
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
]
cv.sprite(bx + 4, by + 4, CHERRY, {'r': '#E0453A', 'h': '#FFB8A8', 'd': '#8E1A22', 's': '#9A8A42', 'L': '#2A9A58', 'l': '#8AE8AE'})

# ---------- counter and beer-mat boosters ----------
cv.hline(0, 318, W, '#FFE8A8'); cv.hline(0, 319, W, '#F4D58A'); cv.hline(0, 320, W, '#C9A24A'); cv.hline(0, 321, W, '#8A6A1E')
cv.hline(0, 322, W, '#120A05')
cv.rect(0, 323, W, 12, '#6B4226'); cv.hline(0, 323, W, '#B4835A'); cv.hline(0, 324, W, '#8A5A36'); cv.hline(0, 334, W, '#3B2416')
for k in range(22):
    gx = (k * 29 + 7) % W
    cv.hline(gx, 326 + k % 6, 5 + k % 5, '#5A3A24')
    cv.hline(gx + 2, 327 + k % 6, 3, '#7A4A2C')
cv.rect(0, 335, W, H - 335, '#3B2416')
shadow_box(0, 335, W, 6, 0.6, 0.45)
for px_ in range(0, W, 39):
    x1, y1, w1, h1 = px_ + 3, 344, 33, H - 350
    cv.rect(x1, y1, w1, h1, '#33200F')
    cv.hline(x1, y1, w1, '#1E120A'); cv.vline(x1, y1, h1, '#1E120A')
    cv.hline(x1, y1 + h1 - 1, w1, '#4E321C'); cv.vline(x1 + w1 - 1, y1, h1, '#4E321C')
    cv.rect(x1 + 4, y1 + 4, w1 - 8, h1 - 8, '#2E1C0E')

ICONS = {
    'undo': ['....#........', '...##........', '..###........', '.############', '..###.......#', '...##.......#', '....#.......#', '............#', '.......######', '.............', '.............'],
    'glass': ['#...........#', '#...........#', '#.....#.....#', '#.....#.....#', '#...#####...#', '#.....#.....#', '.#....#....#.', '.#.........#.', '.#.........#.', '..#########..', '.............'],
    'hint': ['....#####....', '..##.....##..', '.#.........#.', '#...........#', '#...........#', '.#.........#.', '..#.......#..', '...#######...', '...#######...', '....#####....', '.....###.....'],
}


def mat(cx_, y, border, border_dk, icon, count):
    x = cx_ - 16
    shadow_box(x + 3, y + 3, 33, 33, 0.6, 0.5)
    cv.rect(x, y, 32, 32, border)
    cv.hline(x, y, 32, mix(border, '#FFFFFF', 0.25)); cv.vline(x, y, 32, mix(border, '#FFFFFF', 0.25))
    cv.hline(x, y + 31, 32, border_dk); cv.vline(x + 31, y, 32, border_dk)
    cv.rect(x + 3, y + 3, 26, 26, '#F3E6CC')
    cv.hline(x + 3, y + 3, 26, '#FFF9EC'); cv.vline(x + 3, y + 3, 26, '#FFF9EC')
    cv.hline(x + 3, y + 28, 26, '#D8C7A6'); cv.vline(x + 28, y + 3, 26, '#E2D2B2')
    for (dx, dy) in ((0, 0), (31, 0), (0, 31), (31, 31)):
        cv.px(x + dx, y + dy, '#3B2416')
    cv.sprite(x + 10, y + 11, ICONS[icon], {'#': mix(border_dk, '#F3E6CC', 0.35)})
    cv.sprite(x + 9, y + 10, ICONS[icon], {'#': border})
    B = ['....#####....', '..#########..', '.###########.', '.###########.', '#############', '#############', '#############',
         '#############', '#############', '.###########.', '.###########.', '..#########..', '....#####....']
    bx_, by_ = x + 24, y - 7
    cv.sprite(bx_ + 1, by_ + 1, B, {'#': '#6E420E'})
    cv.sprite(bx_, by_, B, {'#': '#E8A33D'})
    cv.hline(bx_ + 4, by_ + 1, 5, '#FFD27A'); cv.hline(bx_ + 2, by_ + 2, 3, '#FFD27A')
    cv.hline(bx_ + 3, by_ + 11, 7, '#B8761E')
    cv.sprite(bx_ + 5, by_ + 3, DIG[str(count)], {'#': '#2A1A10'})


mat(33, 356, '#2A5BA8', '#163670', 'undo', 4)
mat(98, 356, '#A8213A', '#62101E', 'glass', 2)
mat(163, 356, '#D06A14', '#82400A', 'hint', 3)

svg = cv.svg(S, 'Amsterdam level in pixel art')

GB = 'background: transparent; border: none; cursor: pointer; position: absolute;'
buttons = []
for i, (x, y, h) in enumerate([(26, row1, 156), (65, row1 - 7, 156), (104, row1, 156), (143, row1, 156), (46, row2, 156), (85, row2 - 28, 212), (124, row2, 156)]):
    label = ['Glass 1', 'Glass 2, selected', 'Glass 3', 'Glass 4', 'Glass 5', 'Glass 6, chained shut until the cherry brandy is complete', 'Glass 7, empty'][i]
    buttons.append(f'<button aria-label="{label}" style="{GB} left: {x * S}px; top: {y * S}px; width: {26 * S}px; height: {h}px;"></button>')

html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Amsterdam – level (pixel art)</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;600&amp;display=swap" rel="stylesheet">
<style>
body{{margin:0}}
a{{color:#F3E6CC;text-decoration:none}}a:hover{{color:#FFFFFF}}
button{{font-family:'Pixelify Sans',monospace}}
</style>
</helmet>
<div style="width: 390px; height: 844px; position: relative; overflow: hidden; background: #2A1A10; color: #F3E6CC; font-family: 'Pixelify Sans', monospace;">
  {svg}
  <a href="AmsterdamMapPixel.dc.html" aria-label="Back to map" style="position: absolute; left: 0; top: 64px; width: 48px; height: 48px;"></a>
  <div style="position: absolute; left: 40px; top: 64px;">
    <div style="font-size: 22px; font-weight: 600; line-height: 1.05;">Café de Gracht</div>
    <div style="font-size: 14px; color: #D8C3A0; margin-top: 3px;">Amsterdam · Level 64</div>
  </div>
  <div style="position: absolute; left: 248px; top: 70px; width: 128px; height: 34px; display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 13px; white-space: nowrap;"><span style="font-weight: 600; font-size: 17px;">8</span><span style="color: #D8C3A0;">moves · best 21</span></div>
  {''.join(buttons)}
  <div style="position: absolute; left: 0; top: 780px; width: 390px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); text-align: center;">
    <button aria-label="Undo, 4 left" style="background: transparent; border: none; color: #F3E6CC; font-size: 15px; padding: 72px 0 0 0; margin-top: -72px; cursor: pointer;">Undo</button>
    <button aria-label="Extra glass, 2 left" style="background: transparent; border: none; color: #F3E6CC; font-size: 15px; padding: 72px 0 0 0; margin-top: -72px; cursor: pointer;">Extra glass</button>
    <button aria-label="Hint, 3 left" style="background: transparent; border: none; color: #F3E6CC; font-size: 15px; padding: 72px 0 0 0; margin-top: -72px; cursor: pointer;">Hint</button>
  </div>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":390,"height":844}}}}'>
class Component extends DCLogic {{
  renderVals() {{
    return {{}};
  }}
}}
</script>
</body>
</html>
'''
open('/home/claude/pour/project/AmsterdamLevelPixel.dc.html', 'w').write(html)
print(len(html), html.count('<rect'))
