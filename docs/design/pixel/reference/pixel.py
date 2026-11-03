"""Tiny pixel-art canvas that exports merged rects as SVG for design mockups."""


class Canvas:
    def __init__(self, w, h, bg=None):
        self.w, self.h = w, h
        self.g = [[bg] * w for _ in range(h)]

    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h and c is not None:
            self.g[y][x] = c

    def rect(self, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.px(xx, yy, c)

    def hline(self, x, y, w, c):
        self.rect(x, y, w, 1, c)

    def vline(self, x, y, h, c):
        self.rect(x, y, 1, h, c)

    def sprite(self, x, y, rows, pal):
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch in pal:
                    self.px(x + i, y + j, pal[ch])

    def line(self, x0, y0, x1, y1, c, dash=None):
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err, n = dx + dy, 0
        while True:
            if dash is None or (n % sum(dash)) < dash[0]:
                self.px(x0, y0, c)
            n += 1
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy; x0 += sx
            if e2 <= dx:
                err += dx; y0 += sy

    def svg(self, scale, label):
        parts = []
        for y, row in enumerate(self.g):
            x = 0
            while x < self.w:
                c = row[x]
                if c is None:
                    x += 1
                    continue
                x2 = x
                while x2 + 1 < self.w and row[x2 + 1] == c:
                    x2 += 1
                parts.append(f'<rect x="{x}" y="{y}" width="{x2 - x + 1}" height="1" fill="{c}"></rect>')
                x = x2 + 1
        return (f'<svg width="{self.w * scale}" height="{self.h * scale}" viewBox="0 0 {self.w} {self.h}" '
                f'shape-rendering="crispEdges" aria-hidden="true" style="position: absolute; left: 0; top: 0; display: block;">'
                + ''.join(parts) + '</svg>')


DIGITS = {
    '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'],
    '2': ['###', '..#', '###', '#..', '###'], '3': ['###', '..#', '.##', '..#', '###'],
    '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '###', '..#', '###'],
    '6': ['###', '#..', '###', '#.#', '###'], '7': ['###', '..#', '..#', '.#.', '.#.'],
    '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '###'],
}


def digits(cv, x, y, text, c):
    for ch in text:
        cv.sprite(x, y, DIGITS[ch], {'#': c})
        x += 4
