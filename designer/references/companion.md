# Variant Studio (standalone)

Live gallery **after** mode, brief, reverse engineering, token lock and the anti-slop gate. Replaces Visual Companion.

Variant Studio **does not live in this skill**. It is the standalone skill [`variant-studio`](https://github.com/Fonlogen/variant-studio), updated on its own (`update.bat` / `update.sh`). This skill only ships the proxy `scripts/studio.mjs`, which finds it and forwards every command.

Below, `STUDIO` = `node "<SKILL>/scripts/studio.mjs"` (the proxy). Always pass `--project "<PROJECT>"`: everything lives in `<project>/.variant-studio/`.

Config: `config.json` → `companion.enabled`. If `false`, skip and go to the mock.

## 0. Resolve the studio (once per session)

```
node "<SKILL>/scripts/studio.mjs" where
```

Prints `{ path, script, skill, version, source }`. Then **read `skill` (variant-studio's `SKILL.md`)**: it is the source of truth for commands, flags, the `round.json` schema, the decision format and gallery shortcuts. Its `references/` (manifest, platforms, frameworks) are in `path/references/`. If a rule below contradicts that file on **how the studio works**, that file wins. The **design** rules below always win.

Exit 3 / `variant-studio-not-found` → tell the user in one line to install it (`install.bat` on Windows, `./install.sh` on macOS / Linux, Variant Studio dependency) and continue without the studio: mock + Playwright. Never invent a URL.

Proxy search order: env `VARIANT_STUDIO_HOME` → `config.json` `variantStudio.path` → `<skill>/../variant-studio` → global skills (`~/.claude/skills`, `~/.agents/skills`, `~/.kilo/skills`, …) → project skills under the cwd.

## designer overrides (win over the upstream SKILL.md)

- **When**: always after the token lock. Do not ask "open the studio?" if `companion.askBeforeOpen` is `false` (default). One line on what you show, then open.
- **How many**: first round 3–`companion.maxVariants` (default 8) distinct directions, not 2–4. `revise` / `remix` rounds: 2–3.
- **Tokens**: locked variables go to `.variant-studio/global.css` or `<round>/_shared.css`. Every visual decision as a `--token` (the Inspector edits them live and returns them in `tokens`). Never Inter + indigo + `rounded-xl`.
- **Saved style**: copy the style's `tokens.css` into `global.css`; variants explore layout/density/hierarchy inside the style, not new palettes.
- **Fidelity**: `greenfield` = believable placeholders of that world. `existing` = real data, icons, copy, states; repo CSS via `"head": ["/p/…"]`.
- **Group**: `--group "<Product|Game> / <Surface>"` (e.g. `"Shop app / Checkout"`). Run `STUDIO groups` first and reuse exact names.
- **Wait**: `STUDIO wait --project "<PROJECT>" --timeout 1800` with tool timeout **1800000** ms. Never end the turn asking for the pick in chat. Exit 2 → `STUDIO decision` next turn.
- **Kilo**: if the process is killed at the end of the command, `start --foreground` inside `background_process` (`persistent: true`), then `status`.
- **Translatable variants** (when the target is Unity / React Native): prefer real child elements over `::before/::after`, flex over complex grid; see [translate.md](translate.md).

### Kind (mandatory)

| Surface | `--kind` | `--viewports` |
|---|---|---|
| Web app screen / dashboard | `page` | `desktop` or `laptop,mobile` |
| Phone app screen | `page` | `mobile` (`mobile,laptop` if `both`) |
| Hero / landing band | `section` | `laptop,mobile` |
| HUD / inventory / shop / pause / FiveM NUI | `page` | `desktop` (1440). Never mobile unless the brief says so |
| Button, card, input, chip | `component` | `auto` |

`component` is centered with auto height — **not** for a HUD or a full screen.

### Example

```
node "<SKILL>/scripts/studio.mjs" new checkout-layout --project "<PROJECT>" --kind page --viewports mobile --group "Shop app / Checkout" --title "Checkout" --question "Which checkout feels fastest one-handed?" --variants a,b,c,d,e
```

### Decision → pipeline

Full format in the upstream SKILL.md. Mapping:

- `choose` → step 7 (implement `selected[0]` in the real stack), then QA.
- `revise` / `remix` / `regenerate` / `reuse` / `shortlist` → new round `--parent`, **same tokens** unless `tokens` overrides.
- `tokens` → update the locked token block (not just the variant). `text_edits` → copy verbatim. `audit` → mandatory fixes (QA pass 0).
- `references` (images) → treat as step-3 references, not as permission to change mode.
- `viewed_at.viewport = mobile` on a `desktop` brief (FiveM/NUI) → ignore for layout, do not add mobile breakpoints.

## Never

- Copy `studio.mjs` or `ui/` into this skill: the studio is only updated in its standalone folder.
- Use `scripts/visual-companion` or Visual Companion.
- Open the studio before the tokens.
