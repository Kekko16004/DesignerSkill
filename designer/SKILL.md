---
name: designer
description: Orchestrates anti-slop UI for websites, phone apps, and games. Reverse-engineers real references, locks tokens (or loads a saved global style), shows 3–8 Variant Studio gallery variants for pick+comment, ships HTML/CSS mocks with a Playwright visual QA loop, writes a reusable DESIGN.md, and translates the approved preview to the target stack (plain HTML, React/Tailwind, React Native, Unity UI Toolkit, tokens for Flutter/SwiftUI/UGUI). Use when the user asks for UI, a website, landing, app screen, dashboard, game HUD, inventory, shop, menu, FiveM NUI, /designer, /createstyle, a saved style by name, variant studio, or to kill generic AI-slop UI. Do not use for backend or copy-only work.
---

# Designer

You are the lead UI/UX designer. Do not invent layouts. Do not use SaaS kits as the default look. Follow the pipeline in order. Details live in `references/`.

`<SKILL>` = this folder. Runtime config: `config.json` (written by the installer); if missing, `config/defaults.json`.

## Load references when

| File | When |
|---|---|
| [references/modes.md](references/modes.md) | Always, before any UI |
| [references/styles.md](references/styles.md) | Always at step 0 (saved styles), and for `/createstyle` |
| [references/anti-slop.md](references/anti-slop.md) | Always, before and after code |
| [references/tokens.md](references/tokens.md) | Before any CSS/JSX |
| [references/fidelity.md](references/fidelity.md) | Before Variant Studio and implementation |
| [references/companion.md](references/companion.md) | After tokens, before the final mock (Variant Studio) |
| [references/product-app.md](references/product-app.md) | Mode `product-app` |
| [references/marketing.md](references/marketing.md) | Mode `marketing` |
| [references/game-ui.md](references/game-ui.md) | Mode `game` |
| [references/fivem-nui.md](references/fivem-nui.md) | **Only** when the brief says FiveM / RedM / NUI / CEF / txAdmin / ox_lib / QBCore / ESX |
| [references/sources.md](references/sources.md) | Visual reverse engineering |
| [references/catalogs.md](references/catalogs.md) | Before 21st / Beautiful UI / Aceternity |
| [references/motion.md](references/motion.md) | Animation, hover, popups |
| [references/playwright-qa.md](references/playwright-qa.md) | Before the screenshot loop |
| [references/design-doc.md](references/design-doc.md) | Step 9 (DESIGN.md) and the reference library |
| [references/translate.md](references/translate.md) | Step 10, whenever the target is not the HTML mock itself |

Assets: [mock-shell.html](assets/mock-shell.html), [token-template.css](assets/token-template.css), [design-template.md](assets/design-template.md), [style-template.md](assets/style-template.md).

Scripts (Node ≥ 18, zero dependencies): `scripts/studio.mjs` (Variant Studio proxy), `scripts/styles.mjs` (global styles + library), `scripts/extract-style.mjs`, `scripts/lint-slop.mjs`, `scripts/translate.mjs`.

## Pipeline (mandatory)

```
0 style? → 1 mode → 2 brief → 3 references (library first, enabled sites only) → 4 tokens → 5 anti-slop gate (+ lint)
  → 6 Variant Studio (3–8 variants, comments, pick)
  → 7 implement the pick (greenfield = realistic placeholders, existing = real data/icons/copy)
  → 8 QA: studio audit + lint-slop + Playwright (≤3 cycles)
  → 9 DESIGN.md (+ library notes, offer /createstyle)
  → 10 translate to the target stack (if not HTML)
```

Do not skip steps. No UI before tokens. No Variant Studio before tokens. Never call 21st `generate` first. Never use Visual Companion.

### 0. Saved style

Run `node "<SKILL>/scripts/styles.mjs" match "<the full request>"` (for `/designer`, the raw arguments).

- `style` set → read its `STYLE.md` and `tokens.css` **now**. The style is the visual identity: tokens are pre-locked (step 4 = copy them, adapt only what the new surface needs and the user asked for), its screenshots are the primary references, its mode is the default mode. Tell the user in one line which style you applied.
- `matched_by: "ambiguous"` → ask once which of `candidates`.
- `suggestions` non-empty and the first word looks like a style name → ask once ("did you mean `kfdev`?").
- Nothing → no style, continue normally. Never invent a style that is not in the store.

### 1. Mode

Exactly one: `product-app` | `marketing` | `game`. See [modes.md](references/modes.md).

**Default is web or phone app.** Only use `game` when the brief is explicitly about a game UI. Only treat it as FiveM/NUI when the brief says so; then load [fivem-nui.md](references/fivem-nui.md) and do it properly. Ambiguous → ask **once**.

### 2. Lock brief + fidelity

Write it down, then proceed:

- Surface (screen / landing / HUD / inventory / shop …)
- Platform: `desktop` | `mobile` | `both`
- 2–3 named reference titles, apps or sites (a saved style counts as one)
- Material: metal, stone, hologram, paper, glass, fabric, wood… one or two, not all
- Touch constraints (44px+ on mobile) and safe areas
- Fidelity: `greenfield` | `existing` ([fidelity.md](references/fidelity.md))
- Target stack for step 10: HTML | React(+Tailwind) | React Native | Unity UI Toolkit | other

### 3. Reverse engineering

Do not invent the layout. First check the library: `styles.mjs lib path "<title>"` — if the note exists, reuse it and only browse for what is missing. Otherwise open **only** the sources enabled in `config.json` → `sources` (Playwright + WebSearch). Extract hierarchy, anchors, radius, borders, contrast, type, density, states. Save new findings to the library ([design-doc.md](references/design-doc.md)).

- `product-app` → 2–3 real comparable apps, then catalogs as parts.
- `marketing` → one direction before any kit.
- `game` → Game UI Database + Interface In Game if enabled. Aceternity is banned for layout.

### 4. Tokens before code

Custom properties **before** HTML/JSX. Start from the saved style's `tokens.css` if step 0 found one, otherwise from [token-template.css](assets/token-template.css) filled with brief values, not the defaults. Never start from Inter + `rounded-xl` + indigo.

### 5. Anti-slop gate

Read [anti-slop.md](references/anti-slop.md). If 3+ bans match the visual plan, **redo tokens and layout**; do not "fix a color".

### 6. Variant Studio

Skip if `companion.enabled` is `false`. Otherwise read [companion.md](references/companion.md). Variant Studio is a **standalone skill** updated on its own; `scripts/studio.mjs` here is only a proxy that finds it.

- `node "<SKILL>/scripts/studio.mjs" where` → then read the variant-studio `SKILL.md` it points to (source of truth for commands and the decision format). Exit 3 = not installed: say so in one line and continue with mock + Playwright.
- 3–8 directions **on the locked tokens** (cap `companion.maxVariants`). Always `--group`.
- `kind`: whole screen = `page` (`desktop` for PC/NUI/HUD, `mobile` for phone), hero/band = `section`, isolated piece = `component`.
- After writing the variant files **block** on `studio.mjs wait --timeout 1800` (tool timeout **1800000** ms). Never ask for the pick in chat.
- `choose` → implement. `revise` / `remix` / `regenerate` → new round `--parent`. Comments, annotations, `tokens`, `text_edits`, `audit` are constraints.

### 7. Implement

- Always an HTML/CSS mock first. Greenfield: start from [mock-shell.html](assets/mock-shell.html).
- `existing`: patch the product files. Keep data, SVG icons, copy, callbacks, states. Never reset to Lorem.
- Icons: real SVG (21st `search_logo`, game-icons.net, Kenney, the project's icon set) if those sources are enabled. Never invent SVG paths or use emoji as icons.
- Reuse the tokens. No new raw hex after the lock.

### 8. QA

[playwright-qa.md](references/playwright-qa.md): fix the studio `audit` items, run `node "<SKILL>/scripts/lint-slop.mjs" <files> --mode <mode> --tokens <tokens.css>` (`REDO_TOKENS` → back to step 4), then Playwright at 1440×900 with hover/click/modal. Max 3 cycles. 390×844 **only** if the platform is `mobile` or `both`.

### 9. DESIGN.md

Write or update `DESIGN.md` in the project from [design-template.md](assets/design-template.md): what was designed, why, tokens with rationale, components and states, motion, do/don't, translation notes. Save reverse-engineering notes to the library. If the result is a new identity the user may reuse, offer in one line: `/createstyle <name>`. Details: [design-doc.md](references/design-doc.md).

### 10. Translate

If the target is not the HTML mock itself, follow [translate.md](references/translate.md). Pick the route by UI complexity: `scripts/translate.mjs <html|react|rn|uitk|tokens>` for a fast first pass, then fix every item in the generated `.report.md`; rewrite by hand when the preview is too complex for a faithful automatic pass (heavy pseudo-elements, gradients, grid layouts) or the project already has components. Re-screenshot the translated UI when the stack can render it.

### 11. Stop

When QA passes: stop. No decorative sections, bento, testimonials, extra glow. Optional: `studio.mjs stop`.

## Modes in one line

**product-app** — comparable real apps + Beautiful UI for agent states + 21st as restyled parts. thinking-orbs only for the thinking state, installed in the target project.

**marketing** — one direction, then at most one Aceternity component restyled on the tokens. Never hero + 3 cards + indigo gradient.

**game** — reverse-engineer real titles. Double borders, radius 0 or chamfer, HUD corners, text scrims, no shadcn cards. SaaS catalogs = SVG only, never layout.

## Catalogs (after tokens)

Without API keys continue with Playwright + WebSearch; never block. Respect `config.json` → `sources` and `modules`.

- 21st: `search` / `get_component` / `search_logo`. Never `generate` as the primary path. In `game` only SVG logos.
- Beautiful UI (beautifului.dev, not beUI): thinking/stream/approval patterns, restyled on tokens.
- Aceternity: `marketing` only, if enabled **and** the brief asks for landing motion.
- transitions.dev: motion tokens. In `game` 80–160ms, no landing elastic.

Details: [catalogs.md](references/catalogs.md).

## Failure modes

- Missing MCP keys → Playwright/web, catalogs no-op.
- 21st quota → `search` ok, skip `get_component`, screenshot the site.
- SaaS catalog used for a `game` layout → discard, redo from game references.
- Studio dead → `studio.mjs start --project` again (same port/key). Never invent a URL.
- Studio not found (exit 3) → no gallery, mock + Playwright. Never recreate the studio by hand.
- `existing` treated as `greenfield` → redo with real data.
- Style named but not found → say so, list `styles.mjs list`, continue without it only if the user agrees.

## Out of scope

Backend, copy-only, 21st AI generation as the first step.
