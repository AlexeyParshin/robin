# Art assets

All sprites are PNG with transparency, drawn for a **960 × 540** stage and rendered with
`image-rendering: pixelated`, so keep them crisp (no anti-aliasing).

| File | Size (px) | Notes |
|---|---|---|
| `sprites/room-kitchen.png`, `room-living.png`, `room-bedroom.png` | 960 × 540 | Room backgrounds (one per heist). Floor starts at y = 400. Left 240 px is covered by the clue panel. |
| `sprites/scenes/victory.png` | 144 × 96 | Robin with the sack of loot (shown 2× on the victory screen). |
| `sprites/scenes/escaped.png` | 144 × 96 | Robin running away without the sack. |
| `sprites/scenes/caught.png` | 144 × 96 | Robin behind bars. |
| `sprites/scenes/defeat.png` | 144 × 96 | Puzzled Robin, arms spread. |
| `sprites/robin.png` | 48 × 72 | The hero, stands at (244, 448). |
| `sprites/fridge.png` | 110 × 220 | Kitchen |
| `sprites/table.png` | 200 × 120 | Kitchen |
| `sprites/cupboard.png` | 200 × 130 | Kitchen |
| `sprites/bin.png` | 70 × 80 | Kitchen |
| `sprites/sofa.png` | 220 × 120 | Living room |
| `sprites/tv.png` | 160 × 110 | Living room |
| `sprites/shelf.png` | 220 × 150 | Living room. Open back (transparent between the books) so the *behind* / *between* markers show through. |
| `sprites/bag.png` | 90 × 90 | Living room |
| `sprites/bed.png` | 240 × 130 | Bedroom |
| `sprites/wardrobe.png` | 120 × 280 | Bedroom |
| `sprites/nightstand.png` | 90 × 80 | Bedroom |
| `sprites/chair.png` | 80 × 110 | Bedroom |
| `sprites/box.png` | 70 × 60 | Bedroom |
| `sprites/items/*.png` | 32 × 32 | Item icons; shown at 32 px in the loot bar and 48 px in animations. |

Furniture positions and the clickable **zones** (one per preposition) can be changed without touching code in the admin (**Places** tab).
Markers for **behind** and **between** are rendered *under* the furniture sprite, so draw transparent gaps where a hidden thing should peek out.

Palette used by the placeholders:

```
#1b1b2f dark   #f4f1de paper   #ffd166 gold   #d64545 red   #4da3ff blue
#5ad45a green  #ff9f43 orange  #b57bff purple #ff6fb5 pink  #2fd4c8 teal
#8b5a2b wood   #c68a4d light wood   #c0c0d0 metal
```

Regenerate the placeholders any time with `node tools/make-placeholders.mjs`.
Font: Press Start 2P by CodeMan38, SIL Open Font License.
