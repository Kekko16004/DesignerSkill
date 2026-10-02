# Installing designer

Without any API key the skill works (Playwright + WebSearch + Variant Studio). Keys only unlock catalogs.

## 1. Installer

Double-click `install.bat` in the repo root (shortcut to `designer\install.bat`), or from a terminal:

```
install.bat
```

It asks three things (Enter = recommended `*`, or `all` / `none` / numbers like `1 3 4`):

1. **Hosts** — where to install. Recommended: Claude Code, Kilo Code, Codex, Antigravity. Optional: Cursor, OpenCode, GitHub Copilot, Windsurf.
2. **External dependencies and modules** — each one is fetched from GitHub only if selected:
   - Variant Studio (Fonlogen/variant-studio)
   - transitions.dev skill (Jakubantalik/transitions.dev)
   - 21st.dev MCP
   - `/designer` + `/createstyle` commands
3. **Sites** — which sites the skill may open during reverse engineering. Unselected ones stay `false` in `config.json` and are never visited.

Non-interactive:

```
install.bat -All
install.bat -Quiet
install.bat -Hosts kilo,claude -SkipModules mcp21st -SkipSources aceternity,artStation
install.bat -StudioMode copy
install.bat -StudioPath D:\variant-studio
install.bat -Reuse                         repeat the last install's choices, no questions
```

Your choices are saved in `~\.designer\install.json` (used by `update.bat`).

Then **restart** the selected clients. Node.js ≥ 18 is required by the scripts and Variant Studio.

## 2. What gets written

Each host gets the same set of skill folders (unified paths: `designer` and `variant-studio` side by side):

| Host | Skills | Commands |
|---|---|---|
| Claude Code | `~\.claude\skills\` | `~\.claude\commands\` |
| Kilo Code | `~\.kilo\skills\`, `~\.config\kilo\skills\` | `~\.kilo\command(s)\`, `~\.config\kilo\command(s)\` |
| Codex | `~\.codex\skills\`, `~\.agents\skills\` | `~\.codex\prompts\` |
| Antigravity | `~\.gemini\antigravity\skills\`, `~\.antigravity\skills\` | — |
| Cursor / OpenCode / Copilot / Windsurf | their skills folder | OpenCode: `~\.config\opencode\command\` |

- Each copy gets a `config.json` with the chosen hosts/modules/sources.
- Each copy gets a `styles` link to the shared store `~\.designer\styles` (override with env `DESIGNER_HOME`). The reference library is `~\.designer\library`.
- Old installs named `real-world-design` and the old `/design` command (it conflicted with Claude Code) are removed.

## 3. Variant Studio (standalone)

Not part of the skill. It is the separate skill [Fonlogen/variant-studio](https://github.com/Fonlogen/variant-studio), in this repo as the **git submodule** `variant-studio\`. `designer\scripts\studio.mjs` is only a proxy that finds it and forwards commands.

The installer puts `variant-studio` next to `designer` in every host as a **junction** to the standalone folder (or a copy with `-StudioMode copy`) and writes its path into `config.json` → `variantStudio.path`. Without git it downloads the zip from GitHub.

Proxy search order: env `VARIANT_STUDIO_HOME` → `variantStudio.path` → `..\variant-studio` next to the skill → global skills → project skills. Check:

```
node designer\scripts\studio.mjs where
```

## 4. Updating (one click)

Double-click `update.bat` in the repo root (shortcut to `designer\update.bat`). It updates everything from GitHub:

1. `git pull` of this repo (the designer skill) + its Variant Studio submodule
2. Variant Studio to the latest upstream commit (`git submodule update --remote`)
3. reinstall with the choices of the last install (`install.bat -Reuse`), no questions; this also refreshes transitions.dev and the commands

Options: `-NoSelf` (skip the repo pull), `-NoInstall` (skip the reinstall), `-StudioPath D:\vs`. If `git pull` fails because of local changes it warns and continues with the local version.

Variant Studio ends up ahead of the commit pinned in this repo; to pin it: `git add variant-studio && git commit`.

## 5. API key (only if you selected the 21st MCP)

Never commit it, never paste it in chat.

1. https://21st.dev/settings/api-keys
2. `setx API_KEY_21ST "paste_here"`
3. Close **every** terminal and IDE (`setx` does not affect open sessions).

Where it is written: Claude Code via `claude mcp add-json -s user` (top-level `mcpServers` of `~\.claude.json`), Kilo `~\.config\kilo\kilo.json(c)`, Cursor `~\.cursor\mcp.json`, Antigravity `~\.gemini\antigravity\mcp.json`. Without the env variable the installer writes the `${API_KEY_21ST}` placeholder; if the client does not expand it (401), paste the key into that file only.

## 6. Use

```
/designer settings screen for a fitness app
/designer kfdev onboarding                 first word = saved style
/createstyle                                extract the current project's style (name from the project)
/createstyle kfdev                          same, explicit name
/createstyle noir dark editorial, cream paper, red accent, serif headlines, square corners
```

Or just ask: *use the designer skill for a Dark Souls-like inventory in Unity*.

## 7. Never

- Keys in README, chat, repo
- 21st as the layout of a HUD
- 21st `generate` as the first step
- Opening sites with `sources.* = false`
