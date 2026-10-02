# Catalogs and MCP

Use **after** brief + tokens. Without keys: skip, continue with Playwright. If `config.json` disables `twentyFirst` / `aceternity` / `beautifulUi`, treat that catalog as absent.

Env (user, never commit):

- `API_KEY_21ST` — https://21st.dev/settings/api-keys

Kilo: `~/.config/kilo/kilo.json` server `21st`. If `${VAR}` does not expand in headers, the user puts the key in the client's secret store / env.

## 21st.dev

Endpoint: `https://21st.dev/api/mcp`
Auth: header `x-api-key`

| Tool | Use | Notes |
|---|---|---|
| `search` | Find components | Free |
| `search_picker` | If the host supports it | Free |
| `search_logo` | Brand/UI SVG | Game: ok for logos |
| `get_component` | Code + demo | Metered on free |
| `get_theme` | Theme CSS | Free |
| `generate` | AI generation | **Never as the first step** |

In `game`: only `search_logo`. Layout comes from GUIDB.

## Beautiful UI

https://www.beautifului.dev/ — no MCP. Playwright + copy the pattern, restyle.

Not beUI (beui.dev / mcp.beui.dev). beUI Pro is out of scope.

## Aceternity

https://ui.aceternity.com/ — marketing only, after the direction. No MCP. If the result is bento+indigo, discard it.

## Component Gallery

https://component.gallery/ — taxonomy (accordion vs disclosure). Do not copy Material/Polaris looks onto a souls-like.

## Agentation

Optional. React 18+, desktop. Local MCP on port 4747 if the user wants it. Never block the skill if missing.

## Quota / errors

401 → missing key, continue without the catalog.
Quota → do not retry `get_component`; screenshot the component page.
