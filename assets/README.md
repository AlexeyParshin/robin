# Art assets

All sprites are PNG with transparency, drawn for a **960 × 540** stage and rendered with
`image-rendering: pixelated`, so keep them crisp (no anti-aliasing).

| File | Size (px) | Notes |
|---|---|---|
| `sprites/room.png` | 960 × 540 | Background. Floor starts at y = 400. Left 240 px is covered by the clue panel. |
| `sprites/robin.png` | 48 × 72 | The hero, stands at (244, 448). |
| `sprites/fridge.png` | 110 × 220 | Place sprite, default hotspot (250, 180). |
| `sprites/bed.png` | 240 × 130 | (715, 280) |
| `sprites/table.png` | 200 × 120 | (400, 290) |
| `sprites/bag.png` | 90 × 90 | (620, 320) |
| `sprites/shelf.png` | 220 × 150 | (400, 90) |
| `sprites/items/*.png` | 32 × 32 | Item icons; shown at 32 px in the loot bar and 48 px in animations. |

Hotspot positions/sizes can be changed without touching code in the admin (**Places** tab).

Palette used by the placeholders:

```
#1b1b2f dark   #f4f1de paper   #ffd166 gold   #d64545 red   #4da3ff blue
#5ad45a green  #ff9f43 orange  #b57bff purple #ff6fb5 pink  #2fd4c8 teal
#8b5a2b wood   #c68a4d light wood   #c0c0d0 metal
```

Regenerate the placeholders any time with `node tools/make-placeholders.mjs`.
Font: Press Start 2P by CodeMan38, SIL Open Font License.
