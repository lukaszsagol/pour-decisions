# Asset prompts

Ready-to-paste prompts for generating art and sound for Pour Decisions. Every
prompt is self-contained. The pixel-art ones follow `docs/spec/pixel-art.md`:
a hard pixel grid, no anti-aliasing, 3–5 tones per material, light from the top
left, ordered dithering instead of gradients.

**Tools.** General image models (Midjourney, ChatGPT/GPT image, Imagen, Flux)
make convincing *concepts*, but their pixels don't sit on a real grid. For
assets that go straight into the game, use a pixel-art model (Retro
Diffusion, PixelLab), or generate a concept and let the agent snap it to
the grid, cut it down to the game's palette and redraw it in code. For each
asset, generate 4–8 options and keep the best.

**Delivery.** Put the results in `docs/design/generated/<group>/`. Images
should be PNGs with a transparent background unless the prompt says
otherwise; audio should be WAV or OGG.

## City palettes

Used in the prompts below. Hex values are the game's own.

| City | Colours |
| --- | --- |
| Amsterdam | walnut #2A1A10 #3B2416 #6B4226 · brass #8A6A1E #C9A24A #F4D58A · orange #B05408 #F28C28 · Delft blue #1A3E80 #2A5BA8 #7AA2E6 · cream #F3E6CC |
| London | fascia green #0C2219 #16382B #2C5A46 · flock red #330C10 #4A1418 #74242C · mahogany #200C06 #4E2216 #8A4A30 · brass #C9A24A #F4D58A · cream #EFE6D2 |
| New York | lacquer #000000 #0B0B0B #1A1A1A · gold #6E5414 #D4AF37 #F2D670 #FFF2B8 · marble #D8D4CA #E8E6E0 · wine #4A1E2A |
| Tokyo | navy #05081A #0B1030 #141C48 · neon pink #FF5C8A #FFC2D4 · neon cyan #5EC3F0 #D2F0FF · lantern red #A82A22 #E0453A · hinoki #B8946A #D9B98A #F2DCB4 · cream #F4ECDD |

---

## 1. App icon

Output: square PNG, 1024×1024, drawn on a 48×48 grid and scaled up 20×+ with
nearest neighbour. Background filled (not transparent). The subject must sit
inside the middle 65 %, because launchers crop to circles and rounded squares.

**Main**

```
Pixel art app icon for a cosy drink-sorting puzzle game called "Pour Decisions".
A single tall tulip beer glass, seen straight on, tilted slightly to the right as if mid-pour,
filled with three clean horizontal layers of liquid: deep orange at the bottom, cobalt blue in the
middle, cream on top; each layer has a lighter top edge and a darker right edge.
A thin 2-pixel stream of orange liquid pours from the rim towards the bottom right corner.
Warm brass highlight on the rim, one white specular glint down the left side of the glass.
Background: dark walnut wood planks (#2A1A10, #3B2416) with a soft, dithered warm lamp glow
behind the glass, like a Dutch brown café at night.
Strict pixel art on a 48x48 grid, upscaled with nearest neighbour: hard square pixels, no
anti-aliasing, no gradients, no blur, 3-5 tones per material, light from the top left,
ordered Bayer dithering for shading.
Palette only: #2A1A10 #3B2416 #6B4226 #C9A24A #F4D58A #F28C28 #B05408 #2A5BA8 #7AA2E6 #F3E6CC #FFFFFF.
The glass fills the middle 65% of the canvas with background all around it (it will be cropped
to a circle). No text, no border, no frame, no logo.
```

**Variant: two glasses clinking**

```
Pixel art app icon for a drink-sorting puzzle game. Two tall glasses clinking at the centre,
tilted towards each other: the left one holds orange and cream layers, the right one blue and
cream layers; three square pixel droplets splash up from where they touch.
Dark walnut background (#2A1A10) with a warm dithered glow behind the glasses.
Strict pixel art on a 48x48 grid, upscaled with nearest neighbour, hard square pixels, no
anti-aliasing, no gradients, 3-5 tones per material, light from the top left, Bayer dithering.
Palette only: #2A1A10 #3B2416 #6B4226 #C9A24A #F4D58A #F28C28 #B05408 #2A5BA8 #7AA2E6 #F3E6CC #FFFFFF.
Subject inside the middle 65% of the canvas. No text, no border.
```

**Variant: Delft tile**

```
Pixel art app icon: one tall tulip glass of layered drinks (orange, blue, cream) standing on a
square blue-and-white Delft tile, the tile's corner flourishes and central flower pattern in
cobalt blue on cream, the tile filling the whole background.
Strict pixel art on a 48x48 grid, upscaled with nearest neighbour, hard pixels, no anti-aliasing,
no gradients, 3-5 tones per material, light from the top left.
Palette only: #1A3E80 #2A5BA8 #7AA2E6 #F3E6CC #FFFFFF #F28C28 #B05408 #2A1A10 #C9A24A.
Glass in the middle 65%. No text.
```

---

## 2. Recipe card drinks (20)

Output: transparent PNG, a 35×75 grid upscaled 8× (280×600). Each drink stands
alone, centred, at the bottom of the canvas. The card behind it is cream
(#F4ECDD), so the glass needs a dark outline.

Each prompt below is complete. They all end with the same style paragraph, so
the 20 drinks match.

### Amsterdam

**1. Kopstootje**

```
Pixel art illustration of a Kopstootje: a small Dutch tulip-shaped jenever glass filled right to
the brim with pale golden jenever (#E2B04A), a tiny bulge of liquid above the rim, standing next to
a small glass of pilsner with a white foam head.
Transparent background, both glasses standing on the bottom edge, centred.
Strict pixel art on a 35x75 grid, upscaled 8x with nearest neighbour: hard square pixels, 1-pixel
dark ink outline (#1B1A2E) around the glass, no anti-aliasing, no gradients, 3-4 tones for the
liquid (lighter top edge, darker right edge), one white glint on the left of the glass, light
from the top left. No text, no shadow, no table.
```

**2. Advocaat with cream**

```
Pixel art illustration of advocaat with cream: a small tulip glass of thick, bright egg-yellow
Dutch advocaat (#F3D34A), topped with a white whipped-cream swirl dusted with brown cocoa powder,
a small spoon leaning in the glass.
Transparent background, glass standing on the bottom edge, centred.
Strict pixel art on a 35x75 grid, upscaled 8x with nearest neighbour: hard square pixels, 1-pixel
dark ink outline (#1B1A2E), no anti-aliasing, no gradients, 3-4 tones per material, light from the
top left. No text, no shadow, no table.
```

**3. Genever old fashioned**

```
Pixel art illustration of a genever old fashioned: a short heavy rocks glass with one big clear
square ice cube, amber drink (#B87A2E), a curl of orange peel draped over the rim.
Transparent background, glass standing on the bottom edge, centred.
Strict pixel art on a 35x75 grid, upscaled 8x with nearest neighbour: hard square pixels, 1-pixel
dark ink outline (#1B1A2E), no anti-aliasing, no gradients, 3-4 tones per material, white glint on
the glass, light from the top left. No text, no shadow, no table.
```

**4. Bessenjenever tonic**

```
Pixel art illustration of a bessenjenever tonic: a tall highball glass with square ice cubes,
deep berry-purple drink (#8E2A5E) with a few pixel bubbles rising, a lemon wheel on the rim.
Transparent background, glass standing on the bottom edge, centred.
Strict pixel art on a 35x75 grid, upscaled 8x with nearest neighbour: hard square pixels, 1-pixel
dark ink outline (#1B1A2E), no anti-aliasing, no gradients, 3-4 tones per material, light from the
top left. No text, no shadow, no table.
```

**5. Improved Holland gin cocktail**

```
Pixel art illustration of an Improved Holland gin cocktail: a stemmed coupe glass with a pale
straw-gold drink (#E8C88A), a thin twist of lemon peel resting on the rim.
Transparent background, glass standing on the bottom edge, centred.
Strict pixel art on a 35x75 grid, upscaled 8x with nearest neighbour: hard square pixels, 1-pixel
dark ink outline (#1B1A2E), no anti-aliasing, no gradients, 3-4 tones per material, light from the
top left. No text, no shadow, no table.
```

### London

**6. Pimm's Cup**

```
Pixel art illustration of a Pimm's Cup: a tall highball glass of russet-amber drink (#B5582E) with
ice cubes, cucumber slices, half a strawberry and an orange slice visible through the glass, a
sprig of mint on top.
Transparent background, glass standing on the bottom edge, centred.
Strict pixel art on a 35x75 grid, upscaled 8x with nearest neighbour: hard square pixels, 1-pixel
dark ink outline (#1B1A2E), no anti-aliasing, no gradients, 3-4 tones per material, light from the
top left. No text, no shadow, no table.
```

**7. Gin and tonic**

```
Pixel art illustration of a gin and tonic: a tall highball glass of almost clear, very pale
green-white drink (#E4EEDC) with ice cubes and rising pixel bubbles, a lime wedge on the rim.
Transparent background, glass standing on the bottom edge, centred.
Strict pixel art on a 35x75 grid, upscaled 8x with nearest neighbour: hard square pixels, 1-pixel
dark ink outline (#1B1A2E), no anti-aliasing, no gradients, 3-4 tones per material, light from the
top left. No text, no shadow, no table.
```

**8. Bramble**

```
Pixel art illustration of a Bramble: a short rocks glass full of crushed ice, a pale lemony drink
with a deep blackberry-purple liqueur (#6E1E3C) bleeding down through the ice from the top, one
blackberry and a lemon slice on top.
Transparent background, glass standing on the bottom edge, centred.
Strict pixel art on a 35x75 grid, upscaled 8x with nearest neighbour: hard square pixels, 1-pixel
dark ink outline (#1B1A2E), no anti-aliasing, no gradients, 3-4 tones per material, light from the
top left. No text, no shadow, no table.
```

**9. Shandy**

```
Pixel art illustration of a shandy: a British pint glass (slightly wider at the top) of hazy
golden beer and lemonade (#E8C468) with a short white foamy head and pixel bubbles rising.
Transparent background, glass standing on the bottom edge, centred.
Strict pixel art on a 35x75 grid, upscaled 8x with nearest neighbour: hard square pixels, 1-pixel
dark ink outline (#1B1A2E), no anti-aliasing, no gradients, 3-4 tones per material, light from the
top left. No text, no shadow, no table.
```

**10. Sloe gin fizz**

```
Pixel art illustration of a sloe gin fizz: a tall highball glass of rich ruby-pink drink (#B23452)
with a thin white fizz on top, ice cubes and pixel bubbles, a lemon twist on the rim.
Transparent background, glass standing on the bottom edge, centred.
Strict pixel art on a 35x75 grid, upscaled 8x with nearest neighbour: hard square pixels, 1-pixel
dark ink outline (#1B1A2E), no anti-aliasing, no gradients, 3-4 tones per material, light from the
top left. No text, no shadow, no table.
```

### New York

**11. Manhattan**

```
Pixel art illustration of a Manhattan: a stemmed coupe glass of deep mahogany-red drink (#7A2E1A),
one dark red cocktail cherry on a gold pick sunk in the glass.
Transparent background, glass standing on the bottom edge, centred.
Strict pixel art on a 35x75 grid, upscaled 8x with nearest neighbour: hard square pixels, 1-pixel
dark ink outline (#1B1A2E), no anti-aliasing, no gradients, 3-4 tones per material, light from the
top left. No text, no shadow, no table.
```

**12. Whiskey sour**

```
Pixel art illustration of a whiskey sour: a short rocks glass with ice, golden-amber drink (#E6B862)
under a thick white foam cap, three small dark dots of bitters on the foam, a lemon wedge on the
rim.
Transparent background, glass standing on the bottom edge, centred.
Strict pixel art on a 35x75 grid, upscaled 8x with nearest neighbour: hard square pixels, 1-pixel
dark ink outline (#1B1A2E), no anti-aliasing, no gradients, 3-4 tones per material, light from the
top left. No text, no shadow, no table.
```

**13. Dry martini**

```
Pixel art illustration of a dry martini: a classic V-shaped martini glass on a long thin stem,
filled with crystal-clear, very pale drink (#E6EAD6), one green olive with a red pimento on a
cocktail pick.
Transparent background, glass standing on the bottom edge, centred.
Strict pixel art on a 35x75 grid, upscaled 8x with nearest neighbour: hard square pixels, 1-pixel
dark ink outline (#1B1A2E), no anti-aliasing, no gradients, 3-4 tones per material, light from the
top left. No text, no shadow, no table.
```

**14. Aviation**

```
Pixel art illustration of an Aviation cocktail: a stemmed coupe glass of pale sky-lavender drink
(#B9B6DE), one dark maraschino cherry resting at the bottom of the bowl.
Transparent background, glass standing on the bottom edge, centred.
Strict pixel art on a 35x75 grid, upscaled 8x with nearest neighbour: hard square pixels, 1-pixel
dark ink outline (#1B1A2E), no anti-aliasing, no gradients, 3-4 tones per material, light from the
top left. No text, no shadow, no table.
```

**15. Cosmopolitan**

```
Pixel art illustration of a Cosmopolitan: a V-shaped martini glass on a thin stem with a bright
cranberry-pink drink (#E2526C), a curled orange peel twist on the rim.
Transparent background, glass standing on the bottom edge, centred.
Strict pixel art on a 35x75 grid, upscaled 8x with nearest neighbour: hard square pixels, 1-pixel
dark ink outline (#1B1A2E), no anti-aliasing, no gradients, 3-4 tones per material, light from the
top left. No text, no shadow, no table.
```

### Tokyo

**16. Umeshu soda**

```
Pixel art illustration of an umeshu soda: a tall highball glass of warm honey-amber plum wine and
soda (#D9AE52) with ice and rising pixel bubbles, one whole small green-yellow ume plum at the
bottom of the glass.
Transparent background, glass standing on the bottom edge, centred.
Strict pixel art on a 35x75 grid, upscaled 8x with nearest neighbour: hard square pixels, 1-pixel
dark ink outline (#1B1A2E), no anti-aliasing, no gradients, 3-4 tones per material, light from the
top left. No text, no shadow, no table.
```

**17. Lemon sour**

```
Pixel art illustration of a Japanese lemon sour: a tall tumbler of pale lemon-cream drink (#EDE7AE)
with ice, rising bubbles and two round lemon slices pressed against the inside of the glass.
Transparent background, glass standing on the bottom edge, centred.
Strict pixel art on a 35x75 grid, upscaled 8x with nearest neighbour: hard square pixels, 1-pixel
dark ink outline (#1B1A2E), no anti-aliasing, no gradients, 3-4 tones per material, light from the
top left. No text, no shadow, no table.
```

**18. Yuzu highball**

```
Pixel art illustration of a yuzu highball: a tall thin highball glass of golden whisky and soda
(#E8C862) with long clear ice spears, fine rising bubbles, a strip of bright yellow yuzu peel on
the rim.
Transparent background, glass standing on the bottom edge, centred.
Strict pixel art on a 35x75 grid, upscaled 8x with nearest neighbour: hard square pixels, 1-pixel
dark ink outline (#1B1A2E), no anti-aliasing, no gradients, 3-4 tones per material, light from the
top left. No text, no shadow, no table.
```

**19. Mizuwari**

```
Pixel art illustration of a mizuwari: a straight short tumbler with one tall block of crystal-clear
ice, light amber whisky and water (#C88E2C), a thin metal bar spoon standing in the glass.
Transparent background, glass standing on the bottom edge, centred.
Strict pixel art on a 35x75 grid, upscaled 8x with nearest neighbour: hard square pixels, 1-pixel
dark ink outline (#1B1A2E), no anti-aliasing, no gradients, 3-4 tones per material, light from the
top left. No text, no shadow, no table.
```

**20. Midori sour**

```
Pixel art illustration of a Midori sour: a short rocks glass with ice, vivid melon-green drink
(#7CCF5C) with a little white fizz on top, a lime wheel and a red cocktail cherry on the rim.
Transparent background, glass standing on the bottom edge, centred.
Strict pixel art on a 35x75 grid, upscaled 8x with nearest neighbour: hard square pixels, 1-pixel
dark ink outline (#1B1A2E), no anti-aliasing, no gradients, 3-4 tones per material, light from the
top left. No text, no shadow, no table.
```

---

## 3. City landmarks for the maps (4)

Output: transparent PNG, a 195×80 grid upscaled 6× (1170×480). This is a
skyline strip at the top of each city map, seen from the side at night. The
sky is transparent and the bottom edge is flat. Keep big, readable shapes.

**Amsterdam**

```
Pixel art night skyline strip of Amsterdam, side view: a row of narrow canal houses with stepped
and bell gables in brick red, brown and dark grey, warm orange lit windows, the Westerkerk tower
rising in the middle with its blue-and-gold crown, a small arched canal bridge in front.
Transparent sky, flat bottom edge, buildings touching the bottom.
Strict pixel art on a 195x80 grid, upscaled 6x with nearest neighbour: hard square pixels, no
anti-aliasing, no gradients, 3-5 tones per material, moonlight from the top left, Bayer dithering.
Palette: #2A1A10 #3B2416 #5A2A1C #6E4A2E #4A3A2A #2E3A4A #E8A33D #C9A24A #F4D58A #2A5BA8 #F3E6CC.
No text, no people, no sky colour.
```

**London**

```
Pixel art night skyline strip of London, side view: Victorian terraced rooftops with chimney pots
in dark green-grey, the Elizabeth Tower (Big Ben) on the right with a pale glowing clock face,
the towers of Tower Bridge on the left, a few warm lit windows, a thin fog band along the bottom.
Transparent sky, flat bottom edge.
Strict pixel art on a 195x80 grid, upscaled 6x with nearest neighbour: hard square pixels, no
anti-aliasing, no gradients, 3-5 tones per material, moonlight from the top left, Bayer dithering.
Palette: #0E1814 #13261F #17302A #1E3A30 #22402F #C9B77A #E8E2C8 #C9C2A8 #8C8670 #C9A24A.
No text, no people, no sky colour.
```

**New York**

```
Pixel art night skyline strip of 1920s Manhattan, side view: stepped Art Deco skyscrapers in black
and charcoal, the Chrysler Building's crown with gold sunburst arches and spire in the middle, the
Empire State Building to one side, rows of tiny gold-lit windows, thin gold pinstripes on the
facades.
Transparent sky, flat bottom edge.
Strict pixel art on a 195x80 grid, upscaled 6x with nearest neighbour: hard square pixels, no
anti-aliasing, no gradients, 3-5 tones per material, light from the top left, Bayer dithering.
Palette: #000000 #0B0B0B #161616 #1A1A1A #6E5414 #B8962E #D4AF37 #F2D670 #FFF2B8.
No text, no people, no sky colour.
```

**Tokyo**

```
Pixel art night skyline strip of Tokyo, side view: dense low buildings and narrow alleys in deep
navy, Tokyo Tower rising in red and white on one side, vertical neon signs glowing pink and cyan
(abstract shapes, no real letters), a row of red paper lanterns, rooftop water tanks.
Transparent sky, flat bottom edge.
Strict pixel art on a 195x80 grid, upscaled 6x with nearest neighbour: hard square pixels, no
anti-aliasing, no gradients, 3-5 tones per material, neon glow done with Bayer dithering.
Palette: #05081A #0B1030 #0D1330 #141C48 #8A7350 #FF5C8A #FFC2D4 #5EC3F0 #D2F0FF #E0453A #F4ECDD.
No text, no letters, no people, no sky colour.
```

---

## 4. Passport stamps (4)

Output: transparent PNG, a 64×64 grid upscaled 8× (512×512). Each is a single
ink colour plus transparency, so it can be stamped over the passport card.
Leave the marked band empty: the agent adds the city name in the game's pixel
font, because image models garble lettering.

**Amsterdam**

```
Pixel art rubber passport stamp, circular, one ink colour only: Delft blue (#2A5BA8) on a
transparent background. A double ring border; inside it, three tulips over a small arched canal
bridge with a row of gabled houses behind. Leave an empty horizontal band across the lower third
for a name (no text). Slightly worn, uneven ink: a few missing pixels along the ring.
Strict pixel art on a 64x64 grid, upscaled 8x with nearest neighbour, hard square pixels, no
anti-aliasing, no gradients, no letters.
```

**London**

```
Pixel art rubber passport stamp, rounded rectangle, one ink colour only: pillar-box red (#B03030)
on a transparent background. A border of small dots; inside it, a red telephone box beside the
Elizabeth Tower, a crown above. Leave an empty horizontal band across the lower third for a name
(no text). Slightly worn, uneven ink: a few missing pixels along the border.
Strict pixel art on a 64x64 grid, upscaled 8x with nearest neighbour, hard square pixels, no
anti-aliasing, no gradients, no letters.
```

**New York**

```
Pixel art rubber passport stamp, octagonal Art Deco frame, one ink colour only: gold (#B8962E) on a
transparent background. Inside, the Chrysler Building's crown with sunburst rays behind it and two
stars either side. Leave an empty horizontal band across the lower third for a name (no text).
Slightly worn, uneven ink.
Strict pixel art on a 64x64 grid, upscaled 8x with nearest neighbour, hard square pixels, no
anti-aliasing, no gradients, no letters.
```

**Tokyo**

```
Pixel art Japanese hanko-style seal stamp, square with rounded corners, one ink colour only:
vermilion (#E0453A) on a transparent background. Inside, Tokyo Tower beside a paper lantern and a
cherry blossom branch. Leave an empty horizontal band across the lower third for a name (no
characters, no letters). Slightly worn, uneven ink like a real seal.
Strict pixel art on a 64x64 grid, upscaled 8x with nearest neighbour, hard square pixels, no
anti-aliasing, no gradients, no text.
```

---

## 5. Bartenders (4 characters × 3 poses)

Output: transparent PNG sprite sheet, 3 frames side by side on a 144×64 grid
(each frame 48×64), upscaled 6× (864×384). Half-body, facing the viewer from
behind the bar; the bar edge crops them at the waist. Frames, left to right:
**neutral** (polishing a glass), **cheering** (arms up, big smile), **thinking**
(hand on chin, one eyebrow up). The same character must look identical in all
three frames.

**Amsterdam: Joost, brown café barman**

```
Pixel art character sprite sheet, 3 frames side by side, each frame 48x64, transparent background.
A friendly Dutch brown-café barman in his fifties: round face, big grey moustache, rolled-up white
shirt sleeves, dark brown leather apron, a tea towel over one shoulder. Half body, facing the
viewer, cropped at the waist by a bar edge.
Frame 1: polishing a small tulip glass with the tea towel, calm smile. Frame 2: both arms raised
in celebration, eyes closed, big grin. Frame 3: hand on chin, one eyebrow raised, thinking.
Identical character, outfit, colours and proportions in all three frames.
Strict pixel art, hard square pixels, upscaled 6x with nearest neighbour, 1-pixel dark outline,
no anti-aliasing, no gradients, 3-4 tones per material, light from the top left.
Palette: #2A1A10 #3B2416 #6B4226 #F3E6CC #E8C4A0 #C8946A #8A5A3A #9A9A9A #F28C28 #C9A24A.
No text, no background.
```

**London: Maggie, pub landlady**

```
Pixel art character sprite sheet, 3 frames side by side, each frame 48x64, transparent background.
A warm British pub landlady in her sixties: curly auburn hair, reading glasses on a chain, a green
cardigan over a cream blouse, a brooch. Half body, facing the viewer, cropped at the waist by a bar
edge.
Frame 1: pulling a pint at a brass beer pump, kind smile. Frame 2: arms raised, cheering, laughing.
Frame 3: glasses pushed up, finger on lips, thinking.
Identical character, outfit, colours and proportions in all three frames.
Strict pixel art, hard square pixels, upscaled 6x with nearest neighbour, 1-pixel dark outline,
no anti-aliasing, no gradients, 3-4 tones per material, light from the top left.
Palette: #0C2219 #16382B #2C5A46 #EFE6D2 #E8C4A0 #C8946A #8A3A1E #B5582E #C9A24A #F4D58A.
No text, no background.
```

**New York: Felix, speakeasy bartender**

```
Pixel art character sprite sheet, 3 frames side by side, each frame 48x64, transparent background.
A sharp 1920s speakeasy bartender in his thirties: slicked-back black hair, thin moustache, black
waistcoat over a white shirt with sleeve garters, gold bow tie. Half body, facing the viewer,
cropped at the waist by a bar edge.
Frame 1: shaking a silver cocktail shaker at shoulder height, confident half-smile. Frame 2: one
arm raised with a fist, winking, grinning. Frame 3: arms folded, head tilted, thinking.
Identical character, outfit, colours and proportions in all three frames.
Strict pixel art, hard square pixels, upscaled 6x with nearest neighbour, 1-pixel dark outline,
no anti-aliasing, no gradients, 3-4 tones per material, light from the top left.
Palette: #000000 #0B0B0B #1A1A1A #E8E6E0 #E8C4A0 #C8946A #6E5414 #D4AF37 #F2D670 #B8B8C0.
No text, no background.
```

**Tokyo: Aiko, Ginza bartender**

```
Pixel art character sprite sheet, 3 frames side by side, each frame 48x64, transparent background.
A precise Ginza cocktail bartender in her thirties: neat black bob haircut, crisp white bartender's
jacket with a mandarin collar, a small navy tie. Half body, facing the viewer, cropped at the waist
by a bar edge.
Frame 1: stirring a mixing glass with a long bar spoon, calm, focused. Frame 2: small bow with a
happy closed-eye smile, one hand raised in a little wave. Frame 3: tapping the spoon against her
chin, thinking.
Identical character, outfit, colours and proportions in all three frames.
Strict pixel art, hard square pixels, upscaled 6x with nearest neighbour, 1-pixel dark outline,
no anti-aliasing, no gradients, 3-4 tones per material, light from the top left.
Palette: #05081A #0B1030 #141C48 #F4ECDD #E8C4A0 #C8946A #2A2A2A #FF5C8A #5EC3F0 #B8B8C0.
No text, no background.
```

---

## 6. Store and marketing art

**Play Store feature graphic** (1024×500, drawn on a 256×125 grid and scaled 4×)

```
Wide pixel art scene for a mobile game banner: the inside of a cosy Dutch brown café at night,
seen from behind the bar. On the dark wooden counter in the foreground stand five tall glasses
filled with neat stacked layers of coloured drinks (orange, cobalt blue, cherry red, cream, plum);
one glass is tilted, mid-pour, a thin stream falling into another. Behind: Delft blue tiles,
stoneware jenever bottles on a shelf, a brass pendant lamp casting a warm glow. Through a window
on the right, a canal at night with gabled houses and lit windows.
Leave the left third calmer and darker for a title to be added later (no text in the image).
Strict pixel art on a 256x125 grid, upscaled 4x with nearest neighbour: hard square pixels, no
anti-aliasing, no gradients, 3-5 tones per material, warm light from the lamp, Bayer dithering.
Palette: #2A1A10 #3B2416 #6B4226 #C9A24A #F4D58A #F28C28 #B05408 #1A3E80 #2A5BA8 #7AA2E6 #F3E6CC #8E2A5E.
No text, no logo, no people.
```

**Four-city poster** (1080×1920 phone wallpaper or story, drawn on a 270×480 grid and scaled 4×)

```
Tall pixel art poster split into four horizontal bands, each a night-time bar from a different
city, separated by thin brass lines: top, a Dutch brown café with Delft tiles and a canal window;
second, a London pub with a green "free house" fascia (no letters), red flock wallpaper and beer
pumps; third, a 1920s New York speakeasy in black lacquer and a gold sunburst; bottom, a Tokyo
alley bar under indigo noren curtains with pink and cyan neon and a red paper lantern. Each band
has a row of tall glasses with stacked coloured drink layers on its counter.
Strict pixel art on a 270x480 grid, upscaled 4x with nearest neighbour, hard square pixels, no
anti-aliasing, no gradients, 3-5 tones per material, Bayer dithering.
No text, no letters, no people.
```

---

## 7. Sound effects

For ElevenLabs Sound Effects or similar. Export WAV at 44.1 kHz, mono, trimmed
tight with no leading silence. Ask for 4 variations of each, so the game can pick
one at random and repeats don't grate. The first five replace the game's
current synthesised sounds (`select`, `pour`, `clink`, `reject`, `unlock`).

| Name | Length | Prompt |
| --- | --- | --- |
| `select` | 0.15 s | `A light glass tap: a fingernail tapping the side of an empty tulip beer glass once, bright and short, close-miked, dry room, no reverb tail.` |
| `pour` | 0.7 s | `Liquid pouring from one glass into another: a short glug and splash, about half a second, cosy and clean, close-miked, slight room tone, ending with the last few drips.` |
| `clink` | 0.6 s | `Two glasses clinking together in a toast, a single bright ringing clink with a short natural decay, warm bar ambience very faint underneath.` |
| `reject` | 0.25 s | `A soft wooden knock: the base of a glass set down on a wooden bar counter a little too firmly, muted, short, no ring.` |
| `unlock` | 0.6 s | `A small brass padlock snapping open, then a light metal chain sliding off and landing on wood, crisp and short.` |
| `complete-glass` | 0.4 s | `A tiny sparkling chime, like a spoon tapping a full glass twice, high and pleasant, short decay.` |
| `win` | 1.5 s | `A short warm celebratory jingle for a cosy puzzle game: three rising notes on a soft vibraphone and a glass clink at the end, cheerful but gentle, no voice.` |
| `star` | 0.3 s | `A single soft sparkly pop for a star appearing on a game results screen, bright, short, no reverb tail.` (generate 3 slightly rising pitches for stars 1–3) |
| `stamp` | 0.5 s | `A rubber passport stamp pressed firmly onto paper: a dull thump with a slight papery rustle, short.` |
| `recipe` | 0.8 s | `A recipe card sliding out of an envelope and flipping onto a wooden table, papery swish and a soft tap.` |
| `tap` | 0.08 s | `A very short soft UI click, like a wooden button, warm, almost silent.` |
| `dead-end` | 0.8 s | `A gentle, slightly comic "uh-oh" made of two descending notes on a muted wooden marimba, short, not harsh.` |

---

## 8. Music loops

For Suno, Udio or similar. Ask for instrumental tracks only. Use 60–90 s
loops that start and end on the same chord, so they loop without a seam.
Export OGG at 128–160 kbps. Keep the music quiet: it sits under the sound
effects while you think.

**Menu and passport**

```
Instrumental, 75 seconds, seamless loop. Warm, cosy lo-fi theme for a puzzle game about drinks in
bars around the world: soft felt piano, brushed drums, upright bass, a little vinyl crackle,
85 BPM, major key, relaxed and welcoming, no sudden changes, starts and ends on the same chord.
No vocals.
```

**Amsterdam: brown café**

```
Instrumental, 90 seconds, seamless loop. Gentle Dutch brown-café music at night: accordion and
soft acoustic guitar, light upright bass, a hint of clarinet, waltz-like 3/4 feel at a slow
tempo, warm and nostalgic, background level, starts and ends on the same chord. No vocals.
```

**London: pub**

```
Instrumental, 90 seconds, seamless loop. Relaxed English pub folk: fingerpicked acoustic guitar,
a little fiddle melody, soft bodhran, 95 BPM, friendly and unhurried, background level, starts and
ends on the same chord. No vocals, no crowd noise.
```

**New York: speakeasy**

```
Instrumental, 90 seconds, seamless loop. 1920s speakeasy jazz played softly: muted trumpet melody,
stride piano, brushed snare, walking upright bass, 110 BPM swing, smoky and elegant, background
level, starts and ends on the same chord. No vocals.
```

**Tokyo: neon alley**

```
Instrumental, 90 seconds, seamless loop. Late-night Tokyo city pop and lo-fi: electric piano with
chorus, slap-free soft bass, gentle drum machine, a light koto phrase now and then, 90 BPM, dreamy
neon mood, background level, starts and ends on the same chord. No vocals.
```

**Daily pour**

```
Instrumental, 60 seconds, seamless loop. Calm, focused puzzle music: marimba and soft pads with a
slow pulse, 80 BPM, curious and light, like solving a crossword with a coffee, starts and ends on
the same chord. No vocals.
```
