# Cities and themes

All four cities share one way of drawing (pixel art drawn in code at 195×422 and scaled 2×, see `pixel-art.md`; no hand-made art files required) and differ in palette, fonts, glass shape, decoration, drinks, blocker skins and sound. A city is data: `themes/<city>.json` plus its level packs. The engine never knows which city it is in.

| | Amsterdam | London | New York | Tokyo |
| --- | --- | --- | --- | --- |
| Setting | Brown café on a canal | Traditional pub | Art Deco speakeasy | Neon back-alley bars |
| Display font | DM Serif Display | Playfair Display | Limelight | Outfit + Zen Kaku Gothic New |
| Glass | Tulip jenever glass with stem | Nonic pint glass | Tall glass with stepped Deco foot | Tall highball |
| Map path | Canal with a brick bridge | Cobbled lane in fog, gas lamps | Gold-edged avenue under Deco towers | Wet alley with lanterns and neon |
| New blocker | Locked glass (chains and padlock) | Hidden units (pewter tankard) | Only glass (velvet rope) and locked glass (Deco door) | Frozen layer (ice ball), planned |
| Bars | Café de Gracht, Proeflokaal Het Anker, … | The Fox and Fiddle, The Crown and Anchor, … | The Gilded Door, The Starlight Room, … | Golden alley, Ginza highball, … |

## Blocker skins

| Rule | Amsterdam | London | New York | Tokyo |
| --- | --- | --- | --- | --- |
| Hidden units | Stoneware jug cover | Pewter tankard | Frosted Deco glass | Unlabelled bottle "?" |
| Only bottle | Named kruik tag | Reserved beer mat | Velvet rope with brass posts | Bottle-keep tag (yuzu badge) |
| Locked bottle | Brass chains and padlock | Locked tap | Art Deco door with keyhole | Shutter down |

Every blocker shows a round badge in the colour of the drink that releases it. No text labels.

## Drinks

Each city lists its drinks in `themes/<city>.json`, ordered so the first N are used in levels with N colours. Requirements:

- At least 10 drinks per city (levels go up to about 10 colours). The current files have 5 each; extending them is a task.
- Adjacent drinks in the list must differ clearly in lightness, not only hue (colour-blind players). A test checks contrast between every pair.
- Real drink names, so recipe cards make sense.
