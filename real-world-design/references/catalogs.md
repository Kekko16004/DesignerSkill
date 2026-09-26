# Catalogs and MCP

Usare **dopo** brief + token. Senza key: skip, continua con Playwright. Se `config.json` disabilita `twentyFirst` / `aceternity` / `beautifulUi`, tratta quel catalogo come assente.

Env (utente, non committare):

- `API_KEY_21ST` — https://21st.dev/settings/api-keys

Kilo: `~/.config/kilo/kilo.json` server `21st`. Se `${VAR}` non si espande negli header, l'utente mette la key nel secret store / env del client.

## 21st.dev

Endpoint: `https://21st.dev/api/mcp`  
Auth: header `x-api-key`

| Tool | Uso | Note |
|---|---|---|
| `search` | Trova componenti | Free |
| `search_picker` | Se l'host lo supporta | Free |
| `search_logo` | SVG brand/UI | Game: ok per loghi |
| `get_component` | Codice + demo | Metered sul free |
| `get_theme` | CSS tema | Free |
| `generate` | AI gen | **Vietato come primo passo** |

In `game`: solo `search_logo`. Layout da GUIDB.

## Beautiful UI

https://www.beautifului.dev/ — nessun MCP. Playwright + copia pattern, restyle.

Non confondere con beUI (beui.dev / mcp.beui.dev). beUI Pro è fuori scope.

## Aceternity

https://ui.aceternity.com/ — marketing only, dopo direzione. Nessun MCP installato. Se il risultato è bento+indigo, scarta.

## Component Gallery

https://component.gallery/ — tassonomia (accordion vs disclosure). Non copiare look Material/Polaris su un souls-like.

## Agentation

Opzionale. React 18+, desktop. MCP locale porta 4747 se l'utente lo vuole. Non bloccare la skill se manca.

## Quota / errori

401 → key mancante, continua senza catalogo.  
Quota → non ritentare `get_component`; screenshot della pagina componente.
