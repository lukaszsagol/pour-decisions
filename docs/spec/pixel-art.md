# Pixel art style guide

The game is drawn as pixel art. This replaces the earlier flat style. The approved reference is the Amsterdam level:

- `docs/design/pixel/amsterdam-level-1x.png`: the exact art, one image pixel per art pixel (195×422).
- `docs/design/pixel/amsterdam-level-2x.png`: the same at 2×.
- `docs/design/pixel/amsterdam-level-screen.png`: as seen on a phone, with text overlays.
- `docs/design/pixel/reference/ams_pixel3.py` and `pixel.py`: the Python that drew it. Port these drawing routines to TypeScript; they are the precise spec for shapes, colours and shading.

Match the reference closely for Amsterdam. Use the same rules and quality bar for everything else.

## Grid and scaling

- The art grid is **195×422 art pixels**: exactly half the 390×844 logical stage. One art pixel = 2 logical px.
- Draw art into small off-screen canvases (or Pixi `Graphics` with whole-pixel coordinates) at art resolution, then scale up with **nearest-neighbour** filtering (`scaleMode: 'nearest'`, CSS `image-rendering: pixelated`).
- Scale by **whole numbers of device pixels**. Choose the largest integer `k` so that `195·k ≤ viewport width × devicePixelRatio` (and the height fits), draw at `k`, and centre with the city's ground colour around it. Never use fractional scaling for art: it blurs and makes pixels uneven.
- All art coordinates, sizes and motion are whole art pixels. No anti-aliasing, no sub-pixel positions, no smooth gradients, no blur, no alpha-blended glows.

## Colour and shading

- Every material uses 3–5 tones: deep shadow, shadow, base, light, highlight. Generate them as fixed hex values (see `mix()` in the reference), not at runtime alpha.
- Light comes from the top left, plus the city's warm light source (Amsterdam's lamp, London's pub lights, New York's sconces, Tokyo's neon).
- Gradients and glows are made with **ordered dithering** (4×4 Bayer matrix in the reference `dith()`): lamp glow on walls, shadows under shelves, drop shadows, fog.
- Outlines: props get a dark outline in a darker shade of their own colour, never pure black.
- Drop shadows: dithered dark pixels offset down and right (see glasses, beer mats, padlock).

## Materials (recipes in the reference)

| Material | Recipe |
| --- | --- |
| Wood planks | 19 px boards, two alternating base tones, light left edge, dark right edge, short grain strokes and knots |
| Brass | `#FFE8A8` / `#F4D58A` / `#C9A24A` / `#A8842E` / `#8A6A1E`, highlight on top-left edges |
| Steel | `#F2F4F6` / `#B8BCC0` / `#7A8086` |
| Stoneware | 10-column cylindrical ramp (see `STONE`) |
| Tiles | 22 px tiles, bevel (light top-left, dark bottom-right), motif in three blues |
| Glass | light left wall, dark right wall, two-tone rim lip, reflection strip down the left (tinted, with gaps) |
| Liquid | per layer: light surface row, dithered second row, dark bottom rows, light left columns, dark right columns, 3-pixel specular on the surface |

## Glasses

- Every glass holds 4 layers of **15 art px** each, inside an interior about 20–22 px wide. The interior profile (width per row) defines the glass shape; see `PROFILE` in the reference.
- Shapes per city: Amsterdam tulip with stem (reference); London nonic pint (straight sides, bulge 6 px below the rim, no stem, thick base); New York tall Deco glass (straight, slight flare at the rim, stepped two-level foot); Tokyo tall highball (straight, thick base, faint ice-cube outlines in the empty part).
- Selected glass: rim and walls switch to the city's selection colour and the glass lifts by 7 art px.
- Empty glass interiors stay dark with the reflection strip, so emptiness reads clearly.
- Liquid colours come from `themes/<city>.json`; derive the 4 shading tones from each base colour with the same ratios as the reference `DRINKS` table.

## Blockers

All blockers are pictures with a round badge (25 px circle: dark outline, cream ring, deep fill, an icon of the releasing drink in its colour). No text.

| City | Locked glass | Hidden units | Only glass |
| --- | --- | --- | --- |
| Amsterdam | Brass chain rings crossing at 45°, steel-shackle padlock (reference) | Stoneware jug lid over the glass | Kruik tag on a string with the drink badge |
| London | Locked beer tap over the glass | Pewter tankard (shaded grey metal, handle, bands) covering the lower layers | Reserved beer mat on top |
| New York | Art Deco door panel with a keyhole | Frosted Deco glass with a sunburst etch | Velvet rope with brass posts in front |
| Tokyo | Metal shutter with slats | Unlabelled bottle "?" units | Bottle-keep tag with a drink badge |

The badge icon is a tiny drawing of the drink (cherries for cherry brandy, a lemon for advocaat, and so on). Where no drawing exists yet, use a small glass filled with the drink's colour.

## Animation

- Motion moves in whole art pixels. A lift is 7 px over about 120 ms.
- Pour: the source glass tilts using 2–3 pre-drawn tilt frames (not free rotation, which breaks the pixel grid), a stream 2 px wide in the drink's colour arcs across, and the target fills one art row at a time.
- Completed glass: a 3-frame sparkle sprite and a short brightening of its rim.
- Lamp glow can flicker by swapping between two dither patterns every 1–2 seconds. Subtle, and off with reduced motion.

## Text and menus

- Font: **Pixelify Sans** (Google Fonts), weights 400 and 600. Text stays real HTML text on top of the canvas (accessible, crisp). Minimum 13 px; body 15 px; titles 22 px.
- Menu screens (passport, level complete, daily, family, training, settings) use the same pixel language:
  - panels with stepped 2 px borders (CSS `box-shadow` steps or a `border-image` built from a tiny pixel image), no rounded corners, no soft shadows;
  - buttons as bevelled pixel slabs: light top-left edge, dark bottom-right edge, 2 px shift down when pressed;
  - icons and stars as pixel sprites on a 2 px grid;
  - city cards on the passport drawn as small pixel scenes (the canal, the pub front, the Deco skyline, the neon alley).
- Keep all existing accessibility: real buttons, labels, 44 px touch targets, contrast.

## City art direction

| City | Backdrop | Light | Counter and boosters |
| --- | --- | --- | --- |
| Amsterdam | Delft tile band, dark plank wall, shelf of stoneware jenever jugs, brass hanging lamp | Warm lamp glow, dithered | Brass rail, grained wood top, panelled front; square beer mats in Delft blue, cherry red, orange |
| London | Green "Free house" fascia with gold letters, deep red flock wallpaper with a diamond pattern, dark wood wainscot, brass beer pumps with coloured pump clips, a dartboard, a framed fox picture | Warm, low, from pub lamps | Mahogany bar, brass rail; tilted beer mats with green borders |
| New York | Black lacquer wall, gold Art Deco sunburst and stepped frieze, tall bottles with gold caps | Gold sconces, cool highlights | Black and white marble top with veins, gold rail, black panels with gold lines; round coasters with double gold rings |
| Tokyo | Indigo noren curtains with a white crest, shelf of kept bottles with white name tags, red paper lantern | Neon pink and cyan glows on a deep navy wall, dithered | Pale hinoki counter, dark front; round coasters with amber rims |

Maps use the same palette per city, drawn as a pixel scene: Amsterdam canal with gabled houses and a bridge, London cobbled lane in dithered fog with gas lamps, New York avenue under stepped towers, Tokyo wet alley with lanterns and neon signs. Level nodes are pixel coins (done, with stars), a ringed coin (hard), a pulsing coin (current) and a dashed coin (super hard, locked).
