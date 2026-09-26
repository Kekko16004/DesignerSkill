# Sources

Priorità: screenshot reali > catalogo curato > invenzione (vietata).

Apri **solo** i siti con `true` in `config.json` → `sources`. Se una source è `false`, non navigarla e non citarla come obbligatoria. Fallback: WebSearch + screenshot che l’utente già ha.

## Game

Obbligatori **se enabled** in config (`gameUiDatabase`, `interfaceInGame`).

| Key | Source | URL | Uso |
|---|---|---|---|
| `gameUiDatabase` | Game UI Database | https://www.gameuidatabase.com | Search elemento+gioco, filtra Mobile se serve |
| `interfaceInGame` | Interface In Game | https://interfaceingame.com | Screenshot/video per genere |
| `artStation` | ArtStation | https://www.artstation.com | UI reel, solo complemento |

Query Playwright: vai al sito, usa search `inventory Dark Souls` / `HUD Hades` / `mobile controls`. Screenshot, poi estrai metriche (radius, border, contrast backing).

Backup: WebSearch `site:interfaceingame.com [game]`. ArtStation solo se `sources.artStation`.

## Product

- `appStore` — App Store / Play screenshots dell'app analoga
- Sito prodotto (Linear, Things, Telegram, …) sempre ok, non è un toggle catalogo
- `beautifulUi` — https://www.beautifului.dev/ — stati agent
- `componentGallery` — https://component.gallery/ — nome del componente, non look

## Marketing / motion

- `originkit` — https://www.originkit.dev/ — MCP `https://mcp.originkit.dev/mcp`
- `twentyFirst` — https://21st.dev/ — MCP `https://21st.dev/api/mcp`
- `aceternity` — https://ui.aceternity.com/ — solo marketing, no MCP in questo round
- transitions.dev — skill companion se `modules.transitionsDev`
- `beautifulUi` — https://www.beautifului.dev/ — non ha MCP; copy pattern

## Icone / SVG

- `twentyFirst` — 21st tool `search_logo`
- `gameIcons` — https://game-icons.net
- Kenney UI packs (web)
- Vietato: path SVG allucinati, emoji-as-icon in game

## Agent annotation

- Agentation: https://github.com/benjitaylor/agentation — solo React preview, `npm i agentation -D` nel progetto. Playwright resta il QA.

## thinking-orbs

- https://github.com/Jakubantalik/thinking-orbs
- `npm i thinking-orbs` nel progetto target
- Stati: working, searching, solving, listening, connecting, weaving, composing, breathing, shaping
- Size 64 avatar / 20 inline
