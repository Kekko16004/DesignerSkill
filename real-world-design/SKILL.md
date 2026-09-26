---
name: real-world-design
description: Orchestrates anti-slop UI for games, phone apps, and marketing. Reverse-engineers real HUD/inventory/shop/skill-tree/menu references, locks tokens, shows 3–8 Variant Studio gallery variants for pick+comment, then ships HTML/CSS mocks (React+Tailwind for app/landing) with a Playwright visual QA loop. Use when the user asks for game UI, HUD, inventario, shop, skill tree, menu, mobile game UI, app telefono, landing, 21st, variant studio, or to kill generic AI-slop UI. Do not use for backend, copy-only, Unity UGUI, or Unreal UMG.
---

# Real-World Design

Lead UI/UX. Non inventare layout. Non usare kit SaaS come default di gioco. Segui la pipeline in ordine. Dettagli in `references/`.

Config runtime: [config.json](config.json) (scelta all’install). Se manca, usa [config/defaults.json](config/defaults.json).

## Quando caricare i reference

| File | Quando |
|---|---|
| [references/modes.md](references/modes.md) | Sempre, prima di scrivere UI |
| [references/anti-slop.md](references/anti-slop.md) | Sempre, prima e dopo il codice |
| [references/tokens.md](references/tokens.md) | Prima di qualsiasi CSS/JSX |
| [references/fidelity.md](references/fidelity.md) | Prima di Variant Studio e dell’implementazione |
| [references/companion.md](references/companion.md) | Dopo i token, prima del mock finale (Variant Studio) |
| [references/game-ui.md](references/game-ui.md) | Modalità `game` |
| [references/product-app.md](references/product-app.md) | Modalità `product-app` |
| [references/marketing.md](references/marketing.md) | Modalità `marketing` |
| [references/sources.md](references/sources.md) | Reverse engineering visivo |
| [references/catalogs.md](references/catalogs.md) | Prima di 21st / Beautiful UI / Aceternity |
| [references/motion.md](references/motion.md) | Animazioni, hover, popup |
| [references/playwright-qa.md](references/playwright-qa.md) | Prima del loop screenshot |

Shell mock: [assets/mock-shell.html](assets/mock-shell.html). Token CSS: [assets/token-template.css](assets/token-template.css).

## Pipeline (obbligatoria)

```
mode → brief → references (solo siti enabled) → tokens → anti-slop gate
  → Variant Studio (3–8 varianti in gallery, commenti, pick)
  → implementazione della scelta
      greenfield = placeholder verosimili
      existing   = dati/icone/copy reali, UI funzionante
  → Playwright QA loop (≤3)
  → React port (se serve)
  → optional Agentation
```

Non saltare passi. Non scrivere UI prima dei token. Non aprire Variant Studio prima dei token. Non chiamare `generate` 21st come primo passo.

### 1. Classifica la modalità

Scegli esattamente una: `game` | `product-app` | `marketing`.

- HUD, inventario, shop, skill tree, pause, diegetic, gacha, battle → `game`
- App telefono, dashboard prodotto, chat agent, settings nativi → `product-app`
- Landing, hero, pricing, marketing motion → `marketing`

Se ambigua, chiedi **una volta**. Default se il brief parla di gioco: `game`.

### 2. Lock brief + fidelity

Scrivi e blocca, poi procedi:

- Superficie (HUD / inventario / shop / schermata app / landing)
- Piattaforma: `desktop` | `mobile` | `both`
- 2–3 titoli o app di riferimento nominati
- Materiale: metallo, pietra, ologramma, carta, vetro, tessuto, legno — uno o due, non tutti
- Vincoli touch (44px+ su mobile) e safe-area
- Fidelity: `greenfield` | `existing` (vedi [fidelity.md](references/fidelity.md))

**FiveM / CEF NUI / overlay PC di gioco:** piattaforma `desktop`. Non fare versione mobile, breakpoint 390, né screenshot 390×844 **salvo richiesta esplicita**. FiveM NUI vive a 16:9 (o ultrawide), non su telefono.

### 3. Reverse engineering

Non inventare il layout. Apri **solo** le source abilitate in `config.json` → `sources` (Playwright + WebSearch). Estrai: gerarchia, anchors, radius, bordi, contrasto, tipografia, densità, stati.

- `game` → Game UI Database + Interface In Game, se enabled. Vietato Aceternity per il layout.
- `product-app` → 2–3 app reali analoghe, poi cataloghi come pezzi.
- `marketing` → direzione unica prima dei kit.

Se Game UI Database è lento o disabilitato: Interface In Game + query `"[elemento] [gioco] UI"`.

### 4. Token prima del codice

Definisci CSS custom properties (o un blocco token) **prima** di HTML/JSX. Copia da [assets/token-template.css](assets/token-template.css) e riempi con valori del brief, non con i default.

Vietato partire da Inter + `rounded-xl` + indigo.

### 5. Gate anti-slop

Leggi [references/anti-slop.md](references/anti-slop.md). Se 3+ ban matchano il piano visivo, **rifai token e layout**. Non “aggiustare un colore”.

### 6. Variant Studio (varianti)

Se `companion.enabled` è `false`, salta. Altrimenti leggi [references/companion.md](references/companion.md) e apri **Variant Studio** (skill `variant-studio` accanto a questa: `../variant-studio/scripts/studio.mjs`). Se non è installata, consiglia di installarla e, se l'utente accetta, lancia `scripts/install-variant-studio.bat`.

- 3–8 direzioni **sui token lockati**. Cap `companion.maxVariants` (default 8).
- `kind`: HUD/NUI/inventario = `page` + viewport `desktop`. App telefono = `page` + `mobile`. Pezzo isolato = `component`.
- Token in `.variant-studio/global.css` o `<round>/_shared.css`. `existing`: `"head": ["/p/…css del repo"]`.
- Dopo i file HTML: **blocca** su `studio.mjs wait --timeout 1800` (tool timeout **1800000** ms). Non chiedere la scelta in chat.
- `choose` → implementa. `revise` / `remix` / `regenerate` → nuovo round `--parent`. Commenti e annotazioni = vincoli.

### 7. Implementa

- Sempre: mock HTML/CSS. Parti da [assets/mock-shell.html](assets/mock-shell.html) in `greenfield`.
- `existing`: patch i file del prodotto. Dati, icone SVG, copy, callback, stati già presenti. Nessun reset a Lorem.
- `product-app` e `marketing`: dopo il mock approvato dal loop, porta in React + Tailwind **usando i token**, non classi default shadcn.
- `game`: resta HTML/CSS salvo richiesta esplicita React.
- Icone: SVG reali (`search_logo` 21st, game-icons.net, Kenney) se quelle source sono enabled. Vietato inventare path SVG o usare emoji come icone di gioco.
- Riutilizza i token. Nessun hex casuale dopo il lock.

### 8. Playwright QA

Segui [references/playwright-qa.md](references/playwright-qa.md). Screenshot 1440×900. Hover/click/modale. Max 3 cicli. Se ancora slop, torna ai token.

390×844 **solo** se la piattaforma del brief è `mobile` o `both`. Skip per FiveM, CEF NUI, HUD PC/console.

### 9. Stop

Quando il gate passa: ferma. Non aggiungere sezioni decorative, bento, testimonial, glow extra. Opzionale: `studio.mjs stop`.

## Modalità in una riga

**game** — reverse engineering titoli reali. Double-border, radius 0 o chamfer, HUD corners, scrim testo, niente card shadcn. Cataloghi SaaS = solo SVG, mai layout.

**product-app** — app analoghe + Beautiful UI per stati agent + 21st come pezzi restyled. thinking-orbs solo per stato thinking, installato nel progetto target.

**marketing** — una direzione. Poi al massimo un componente Aceternity restyled sui token. Mai hero + 3 card + gradient indigo.

## Cataloghi (dopo i token)

Senza API key continua con Playwright + WebSearch. Non bloccarti. Rispetta `config.json` → `sources` e `modules`.

- 21st: `search` / `get_component` / `search_logo`. Mai `generate` come path primario. In `game` solo loghi SVG.
- Beautiful UI (beautifului.dev, non beUI): pattern thinking/stream/approval, restyle sui token.
- Aceternity: solo `marketing` se enabled **e** il brief chiede motion da landing.
- Agentation: opzionale, solo preview React. Playwright resta il loop.
- transitions.dev: motion tokens. In `game` durate 80–160ms, niente elastic da landing.

Dettaglio tool: [references/catalogs.md](references/catalogs.md).

## Failure modes

- Key MCP assenti → Playwright/web, cataloghi no-op.
- Quota 21st → `search` ok, skip `get_component`, screenshot del sito.
- Catalogo SaaS usato per layout `game` → scarta il pezzo, rifai da reference di gioco.
- Agentation su HTML puro → skip.
- Studio morto → `studio.mjs start --project` di nuovo (stesso port/key). Non inventare un URL.
- `existing` trattato come `greenfield` → rifai con i dati reali.

## Fuori scope

Unity UGUI, Unreal UMG, backend, copy-only, generazione 21st AI come primo passo.
