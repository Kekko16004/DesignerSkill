# Product app

Phone apps and product UI. Not HUDs.

## Source loop

1. Name 2–3 real apps (e.g. Things / Linear / Telegram / Health) — or the saved style.
2. Playwright on their marketing pages or App Store screenshots **and** known patterns (tab bar, large title, sheets).
3. Beautiful UI (https://www.beautifului.dev/) only for agent states: thinking, stream, approval, tool chips, task rows. Copy the *pattern*, restyle on the tokens. It is not beUI.
4. 21st `search` → `get_component` as a part (input, tabs), then replace colors/radius/type with the tokens.
5. thinking-orbs: thinking state only. In the target project: `npm i thinking-orbs`. Not global. Not on every spinner.

## Native mobile tells

- Bottom tab bar or top large title, not a squeezed desktop sidebar
- 44px hit targets
- Keyboard avoidance on the composer
- Swipe-back / sheet detents if the brief is iOS-like
- Status bar padding

## App screens (dashboards, admin, settings, tools)

A screen someone works in, not reads (Hallmark § App screens). Marketing rules step aside: no hero, fold, word budget, section rhythm or reveal on load ([web-gates.md](web-gates.md) lists the skipped gates). Everything else binds: tokens, contrast, focus, eight states, no eyebrow, no tracked-caps table heads, no invented figures.

- **Type:** fixed scale at ratio 1.125–1.2, no fluid heads, no display face on labels, buttons or data. One family is often right; a familiar sans is allowed here.
- **Colour:** restrained. Accent = primary action, current selection, state. A second neutral carries sidebars, toolbars, panels.
- **Shell:** top bar by default. A sidebar only past ~7 destinations, collapsing to a menu under 60rem. Standard patterns (tabs, breadcrumbs, command palette) beat invented ones; a modal is the last answer after inline editing and disclosure.
- **Density:** controls 32–40px with a 44px hit target (48 on coarse pointers); one container recipe; tables before cards.
- **Four data states** for every region that loads data: loading (skeleton in the shape of what comes), empty (what belongs here + the one action that fills it), error (what broke + what to do), full. Drawing only "full" is a quarter of the screen.
- **State in the URL:** filters, tabs, pagination. Destructive actions are undone (5–10 s Undo) or confirmed (type the name for irreversible ones).
- **Motion is state:** 120 / 220ms only, nothing orchestrated.
- **Figures** are the product's own, tabular numerals; no icon tile, no gradient, no unmeasured trend arrow.
- **Signature:** the one object the tool is known by (the ledger, the queue, the timeline), not a greeting over four stat cards.

## Agent surfaces (Beautiful UI)

Use these names, do not reinvent:

- Loading / elapsed
- Thinking traces (steps, search, coding)
- Streaming text + sources
- Approval card (human-in-the-loop)
- Tool chips
- Task rows (running / failed / done)
- Prompt bar (@ sources, / commands)

Restyle: their defaults are editorial/AI-native. For a bank or fitness product, change type, radius, ink.

## 21st

Path: `search` → pick 1 component → `get_component` → adapt. Never `generate` first. Free quota exhausted → screenshot the component page and rebuild.

## Output

HTML/CSS mock at 390×844 (phone) or 1440×900 (web app). Then the target: React+Tailwind with the tokens as CSS variables (not `bg-zinc-950 text-indigo-400`), or React Native (`translate.mjs rn` + `translate.mjs tokens`). See [translate.md](translate.md).
