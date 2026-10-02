# DesignerSkill

Global anti-slop UI skill for **websites**, **phone apps** and **game UI** (incl. FiveM NUI when asked). Real references instead of invented layouts, tokens before code, saved global styles, a **Variant Studio** gallery (3–8 variants, comments, pick), HTML/CSS mocks, automated anti-slop lint + Playwright QA, a reusable `DESIGN.md`, and translation of the approved preview to the target stack (plain HTML, React/Tailwind, React Native, Unity UI Toolkit, tokens for Flutter/SwiftUI/UGUI).

## Install

```
install.bat          interactive: hosts, external dependencies, sites   (root shortcut to designer\install.bat)
install.bat -All     everything, no questions
update.bat           update everything from GitHub (skill + Variant Studio + transitions.dev), reinstall with the last choices
```

Details: [designer/INSTALL.md](designer/INSTALL.md). Node.js ≥ 18 for scripts and Variant Studio.

## Use

```
/designer login page for a banking app
/designer kfdev settings screen            <- first word = saved style
/designer Hades-like HUD for my roguelike, Unity
/createstyle kfdev                         <- extract the style of the current project
/createstyle noir dark editorial, cream paper, red accent, Fraunces + Inter Tight, square corners
```

## Pipeline

`style? → mode → brief → references (library first) → tokens → anti-slop gate → Variant Studio → implement → QA (studio audit + lint + Playwright) → DESIGN.md → translate`

## External dependencies

Not copied into the skill; referenced in [dependencies.json](dependencies.json), installed from GitHub only if you say yes, updated with `update.bat`.

| Component | Repo | How |
|---|---|---|
| Variant Studio | [Fonlogen/variant-studio](https://github.com/Fonlogen/variant-studio) | git submodule `variant-studio/`, linked into every host |
| transitions.dev | [Jakubantalik/transitions.dev](https://github.com/Jakubantalik/transitions.dev) | `npx skills add` |
| 21st.dev MCP | https://21st.dev | MCP config, key in `API_KEY_21ST` |

After cloning this repo: `git submodule update --init` (the installer does it for you).

## Layout

```
designer/SKILL.md                 the skill
designer/references/              pipeline details (modes, tokens, anti-slop, styles, translate, fivem-nui, …)
designer/assets/                  mock shell, token template, DESIGN.md + STYLE.md templates
designer/command/                 /designer, /createstyle
designer/scripts/studio.mjs       proxy -> standalone Variant Studio
designer/scripts/styles.mjs       global styles + reference library (~/.designer)
designer/scripts/extract-style.mjs
designer/scripts/lint-slop.mjs
designer/scripts/translate.mjs    html | react | rn | uitk | tokens
designer/evals/                   test prompts to check the skill after changes
designer/install.bat, update.bat
install.bat, update.bat           root shortcuts
variant-studio/                   git submodule
dependencies.json
```
