# Sources

Priority: saved style / library note > real screenshots > curated catalog > invention (banned).

Open **only** sites with `true` in `config.json` → `sources`. If a source is `false`, do not browse it and do not cite it as required. Fallback: WebSearch + screenshots the user already has.

## Library first

`node "<SKILL>/scripts/styles.mjs" lib path "<title>"` → if `exists`, read it before browsing. After browsing, write/append the note ([design-doc.md](design-doc.md)).

## Game

Required **if enabled** (`gameUiDatabase`, `interfaceInGame`).

| Key | Source | URL | Use |
|---|---|---|---|
| `gameUiDatabase` | Game UI Database | https://www.gameuidatabase.com | Search element+game, filter Mobile if needed |
| `interfaceInGame` | Interface In Game | https://interfaceingame.com | Screenshots/videos per genre |
| `artStation` | ArtStation | https://www.artstation.com | UI reels, complement only |

Playwright query: open the site, search `inventory Dark Souls` / `HUD Hades` / `mobile controls`. Screenshot, then extract metrics (radius, border, contrast backing).

Fallback: WebSearch `site:interfaceingame.com [game]`.

## Product

- `appStore` — App Store / Play screenshots of the comparable app
- Product sites (Linear, Things, Telegram…) always ok, not a catalog toggle
- `beautifulUi` — https://www.beautifului.dev/ — agent states
- `componentGallery` — https://component.gallery/ — component names, not looks

## Marketing / motion

- `twentyFirst` — https://21st.dev/ — MCP `https://21st.dev/api/mcp`
- `aceternity` — https://ui.aceternity.com/ — marketing only, no MCP
- transitions.dev — companion skill if `modules.transitionsDev` (external dependency, see `dependencies.json`)

## Icons / SVG

- `twentyFirst` — 21st tool `search_logo`
- `gameIcons` — https://game-icons.net
- Kenney UI packs (web)
- Banned: hallucinated SVG paths, emoji-as-icon in game

## Agent annotation

- Agentation: https://github.com/benjitaylor/agentation — React previews only, `npm i agentation -D` in the project. Playwright stays the QA loop.

## thinking-orbs

- https://github.com/Jakubantalik/thinking-orbs
- `npm i thinking-orbs` in the target project
- States: working, searching, solving, listening, connecting, weaving, composing, breathing, shaping
- Size 64 avatar / 20 inline
