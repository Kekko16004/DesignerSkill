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
