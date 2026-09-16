# Robin Hood: Hidden Loot

A tiny pixel-art browser game that teaches kids English **nouns** and **place prepositions**
(`in`, `on`, `under`, `behind`, `next to`, `between`).

Robin Hood sneaks into a rich family's house. The child reads a clue like
*"The cheese is **in** the fridge."* and clicks the matching **numbered zone**. Every piece of
furniture has one zone per preposition — *on* the bed, *under* the bed, *behind* the bed — so the
child has to read the preposition, not just recognise the noun.

- 3 heists (rounds) in 3 rooms: **Kitchen** (3 items, 60 s) → **Living room** (4 items, 75 s) → **Bedroom** (5 items, 90 s)
- Find everything → victory picture (Robin with the sack) + loot → next heist
- Find only some → **put-back phase**: extra 30 s to put the loot back
  (*"Put the cheese **in** the fridge!"*) — reverse drill of the same words; then *escaped* (Robin running) or *caught* (Robin behind bars)
- Find nothing → puzzled Robin → same items, reshuffled clue list
- Colour-coded prepositions + legend with pixel diagrams, word bank on the final screen
- Chiptune SFX & music (WebAudio, no files), mute button, easy-to-read font toggle
- Pause button (▐▐ in the HUD or `Esc`) → resume or return to the main menu
- Keyboard: `1`–`9` pick a numbered zone, `Space` repeats the clue
- **Admin panel** (`admin.html`) to add/remove PNG pictures, words, places and rounds

No build step, no dependencies, no tracking. Plain HTML + CSS + ES modules.

## Run locally

ES modules need an HTTP server (opening `index.html` via `file://` will not work):

```bash
python3 -m http.server 8080
# then open http://localhost:8080/
```

## Deploy to GitHub Pages

1. Create a repository and push this folder to the `main` branch.
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The included workflow `.github/workflows/pages.yml` publishes the site on every push to `main`.
   The game is then live at `https://<user>.github.io/<repo>/`.

Alternatively choose *Deploy from a branch* → `main` / `root` — that works too because everything
uses relative paths and `.nojekyll` is present.

Other free static hosts that work the same way: Netlify Drop (drag the folder), Cloudflare Pages.

## Admin panel — adding words and pictures

Open `admin.html` (there is a small “⚙ grown-ups” link on the title screen). The password is
`asd123` — change `ADMIN_PASSWORD` in `src/admin/admin.js` if you want another one. It is only
friction to keep kids out, not real security (nothing sensitive is stored in the browser).

| Tab | What you can do |
|---|---|
| **Items** | Add a word + PNG picture (drag & drop), set the article (a / an / none), enable/disable, edit, delete, restore defaults |
| **Places** | Add/edit hiding places: name, PNG sprite, drag-to-place & resize on the room preview, allowed prepositions, per-preposition noun override (e.g. *between the **books***). Select a place to see its coloured **zones** (one per preposition) and drag/resize them to where the child should click. Each place belongs to a **room** (pick the room at the top of the editor). Striped areas in the editor are covered by the HUD, clue list and legend — furniture and zones cannot be dragged or saved there. **behind** / **between** zones are drawn *under* the furniture picture (in the game too) — leave an edge sticking out or use a PNG with transparent gaps |
| **Rounds** | Number of items, places, timer, put-back bonus and wrong-click penalty for each heist; add/remove rounds |
| **Export / Import** | Download or load a `content-pack.json` |

Image rules: PNG only, max 256×256 px, max 200 KB. Pixel art looks best at 32×32 for items.

### Making your changes visible to everyone

Edits made in the admin are stored in **your browser only** (IndexedDB). To ship them to all players:

1. **Export / Import → ⬇ Export pack** — downloads `content-pack.json` (pictures embedded as base64).
2. Copy it to `assets/content-pack.json` in this folder.
3. Commit and push. The game loads that file on start, so everybody gets your words and pictures.

Content is layered: **built-in defaults → `assets/content-pack.json` → local browser edits**.
Later layers override earlier ones by `id`.

## Project layout

```
index.html            game
admin.html            content editor
styles/               pixel.css (palette, font), main.css, animations.css, admin.css
assets/sprites/       placeholder pixel art (regenerate with `node tools/make-placeholders.mjs`)
assets/fonts/         Press Start 2P (OFL)
assets/content-pack.json   optional — exported from the admin
src/data/content.js   built-in items, places, rounds, preposition colours
src/content/repo.js   IndexedDB + pack loading + merge + export/import
src/round.js          round generation, clue text
src/main.js           game state machine
src/ui/               scene (places), panel (clues), hud (timer, loot, legend), screens
src/fx.js             collect/return animations, sparkles
src/audio.js          WebAudio SFX + melody
src/admin/            admin tabs
tools/make-placeholders.mjs   generates the placeholder PNGs (zero dependencies)
```

## Replacing the placeholder art

See `assets/README.md` for exact sizes. Either overwrite the PNG files in `assets/sprites/`
(same names) or upload new pictures through the admin.
