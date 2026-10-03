# Installing designer

Without any API key the skill works (Playwright + WebSearch + Variant Studio). Keys only unlock catalogs.

Works on **Windows**, **macOS** and Linux. Requirements: Node.js ≥ 18 (scripts and Variant Studio) and git (recommended; without it the installer downloads from GitHub).

## 1. Installer

**macOS / Linux** — from Terminal in the repo root (shortcut to `designer/install.sh`; bash 3.2+, works with the stock macOS bash):

```bash
./install.sh
```

or double-click `install.command` in Finder. If macOS blocks it (repo downloaded as zip, "unidentified developer"), right-click → Open once, or run `xattr -dr com.apple.quarantine .` in the repo folder. Node.js on macOS: `brew install node` or the installer from nodejs.org.

**Windows** — double-click `install.bat` in the repo root (shortcut to `designer\install.bat`), or from a terminal:

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

| Windows | macOS / Linux |
|---|---|
| `install.bat -All` | `./install.sh --all` |
| `install.bat -Quiet` | `./install.sh --quiet` |
| `install.bat -Hosts kilo,claude -SkipModules mcp21st -SkipSources aceternity,artStation` | `./install.sh --hosts kilo,claude --skip-modules mcp21st --skip-sources aceternity,artStation` |
| `install.bat -StudioMode copy` | `./install.sh --studio-mode copy` |
| `install.bat -StudioPath D:\variant-studio` | `./install.sh --studio-path ~/variant-studio` |
| `install.bat -Reuse` (repeat the last install's choices, no questions) | `./install.sh --reuse` |

Your choices are saved in `~/.designer/install.json` (used by `update.bat` / `update.sh`).

Then **restart** the selected clients.

## 2. What gets written

Each host gets the same set of skill folders (unified paths: `designer` and `variant-studio` side by side). `~` is your home folder (`%USERPROFILE%` on Windows):

| Host | Skills | Commands |
|---|---|---|
| Claude Code | `~/.claude/skills/` | `~/.claude/commands/` |
| Kilo Code | `~/.kilo/skills/`, `~/.config/kilo/skills/` | `~/.kilo/command(s)/`, `~/.config/kilo/command(s)/` |
| Codex | `~/.codex/skills/`, `~/.agents/skills/` | `~/.codex/prompts/` |
| Antigravity | `~/.gemini/antigravity/skills/`, `~/.antigravity/skills/` | — |
| Cursor / OpenCode / Copilot / Windsurf | their skills folder | OpenCode: `~/.config/opencode/command/` |

- Each copy gets a `config.json` with the chosen hosts/modules/sources.
- Each copy gets a `styles` link (junction on Windows, symlink on macOS / Linux) to the shared store `~/.designer/styles` (override with env `DESIGNER_HOME`). The reference library is `~/.designer/library`.
- Old installs named `real-world-design` and the old `/design` command (it conflicted with Claude Code) are removed.

## 3. Variant Studio (standalone)

Not part of the skill. It is the separate skill [Fonlogen/variant-studio](https://github.com/Fonlogen/variant-studio), in this repo as the **git submodule** `variant-studio/`. `designer/scripts/studio.mjs` is only a proxy that finds it and forwards commands.

The installer puts `variant-studio` next to `designer` in every host as a **junction** (Windows) / **symlink** (macOS / Linux) to the standalone folder (or a copy with `-StudioMode copy` / `--studio-mode copy`) and writes its path into `config.json` → `variantStudio.path`. Without git it downloads the zip / tarball from GitHub.

Proxy search order: env `VARIANT_STUDIO_HOME` → `variantStudio.path` → `../variant-studio` next to the skill → global skills → project skills. Check:

```
node designer/scripts/studio.mjs where
```

## 4. Updating (one click)

Windows: double-click `update.bat`. macOS: double-click `update.command` or run `./update.sh` (also Linux). It updates everything from GitHub:

1. `git pull` of this repo (the designer skill) + its Variant Studio submodule
2. Variant Studio to the latest upstream commit (`git submodule update --remote`)
3. reinstall with the choices of the last install (`install.bat -Reuse` / `install.sh --reuse`), no questions; this also refreshes transitions.dev and the commands

Options: `-NoSelf` / `--no-self` (skip the repo pull), `-NoInstall` / `--no-install` (skip the reinstall), `-StudioPath D:\vs` / `--studio-path ~/vs`. If `git pull` fails because of local changes it warns and continues with the local version.

Variant Studio ends up ahead of the commit pinned in this repo; to pin it: `git add variant-studio && git commit`.

## 5. API key (only if you selected the 21st MCP)

Never commit it, never paste it in chat.

1. https://21st.dev/settings/api-keys
2. Set the env variable:
   - Windows: `setx API_KEY_21ST "paste_here"`
   - macOS / Linux: add `export API_KEY_21ST="paste_here"` to `~/.zshrc` (or `~/.bashrc`). On macOS, apps launched from the Dock/Finder do not read `~/.zshrc`: also run `launchctl setenv API_KEY_21ST "paste_here"` (lasts until reboot) or start the app from Terminal.
3. Close **every** terminal and IDE (open sessions keep the old environment).

Where it is written: Claude Code via `claude mcp add-json -s user` (top-level `mcpServers` of `~/.claude.json`), Kilo `~/.config/kilo/kilo.json(c)`, Cursor `~/.cursor/mcp.json`, Antigravity `~/.gemini/antigravity/mcp.json` (Windows: `install-mcp.ps1`, macOS / Linux: `install-mcp.mjs`). Without the env variable the installer writes the `${API_KEY_21ST}` placeholder; if the client does not expand it (401), paste the key into that file only.

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
