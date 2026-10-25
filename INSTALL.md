# Installing designer

Without any API key the skill works (Playwright + web search + Variant Studio). Keys only unlock catalogs.

Works on **Windows**, **macOS** and Linux. Requirements: [Node.js 18+](https://nodejs.org) (the installer, the scripts and Variant Studio run on it; `install.bat` offers to install it with winget). git is recommended: without it dependencies are downloaded as GitHub zips.

## 1. Install

```bat
install.bat                          :: interactive: detected hosts and recommended modules preselected (arrows, space, enter)
install.bat --yes                    :: no questions (old aliases: -Quiet, -All)
install.bat --hosts claude,codex --skip mcp21st --skip-sources aceternity,artStation
install.bat --dry-run                :: show what would change, write nothing
install.bat --dev                    :: the installed skill is a link to designer/ in this repo (live edits)
update.bat                           :: git pull + every dependency to its latest + reinstall with the saved choices
node installer\install.mjs doctor [--fix]   :: check canonical copy, links, duplicates, commands, MCP
node installer\install.mjs uninstall        :: remove only what the installer created
```

macOS / Linux: `./install.sh`, `./update.sh` (bash 3.2+, the stock macOS bash works) or double-click `install.command` / `update.command` in Finder. If macOS blocks them (repo downloaded as zip), right-click → Open once, or run `xattr -dr com.apple.quarantine .` in the repo folder. Common options: `--lang it|en`, `--json`, `--verbose`, `--no-color`.

The interactive run asks three things:

1. **Hosts**: Claude Code, Codex, Gemini CLI, Antigravity, Cursor, OpenCode, Kilo Code, Windsurf, GitHub Copilot, Roo, Cline. The ones found on this machine are preselected.
2. **Modules**, each fetched from its own repo only if selected (see §3).
3. **Sites** the skill may open during reverse engineering. Disabled ones stay `false` in `config.json` and are never visited.

Then **restart** the open agents.

## 2. What gets written

- **One copy.** The skill goes to `~/.agents/skills/designer` (`~` is `%USERPROFILE%` on Windows). Codex, Gemini CLI, Cursor, OpenCode, Kilo, Windsurf, Copilot and Roo already read that folder. Only the hosts that do not read it get a link (a junction on Windows, no admin needed):
  - Claude Code → `~/.claude/skills/designer`
  - Antigravity → `~/.gemini/config/skills/designer`
  - Cline → `~/.cline/skills/designer`
- **No duplicates.** Older copies in host folders (`~/.codex/skills`, `~/.kilo/skills`, `~/.config/kilo/skills`, `~/.cursor/skills`, `~/.gemini/antigravity/skills`, …) and the old name `real-world-design` are moved to `~/.agents/skillkit/backup/<date>/`. Nothing is deleted. Before, the skill showed up twice, or one copy lagged behind.
- **Commands.** `/createstyle` goes to Claude Code (`~/.claude/commands`), Kilo (only `~/.config/kilo/commands`), OpenCode (`~/.config/opencode/commands`) and Gemini CLI (`~/.gemini/commands/*.toml`). `/designer` is the skill itself everywhere. Only Gemini CLI, which has no skill commands, also gets a `designer` command. The old `/design` command (it clashed with Claude Code), duplicate Kilo command folders and deprecated Codex prompts are removed.
- **`config.json`** in the installed copy: hosts, modules, sites, Variant Studio path. Values you edited by hand are kept on every reinstall.
- **Styles.** A `styles` link points to the shared store `~/.designer/styles` (override with env `DESIGNER_HOME`). The reference library is `~/.designer/library`.
- **Receipt.** `~/.agents/skillkit/designer.json` records hosts, modules, links, commands and MCP entries. `update`, `doctor` and `uninstall` use it. Hosts and new recommended modules found after the last install are added automatically.

## 3. Modules

| Module | Source | What the installer does |
|---|---|---|
| Variant Studio | [Fonlogen/variant-studio](https://github.com/Fonlogen/variant-studio) | Clones it into `~/.agents/skillkit/repos/` and installs it as the skill `~/.agents/skills/variant-studio`, next to `designer`. `update` takes it to the latest upstream commit every time. |
| transitions.dev | [Jakubantalik/transitions.dev](https://github.com/Jakubantalik/transitions.dev) | Installs every skill in the repo (transitions-agent, …). |
| Playwright MCP | `npx -y @playwright/mcp@latest` | Registers the `playwright` MCP server in every picked host and takes over an older `@playwright/mcp` entry. |
| 21st.dev MCP | `https://21st.dev/api/mcp` | Registers the `21st` server with the key as an environment reference (see §5). |

Managed clones are updated with `fetch` + `reset` to the default branch. Local edits in them are stashed first, so nothing is lost. MCP servers you configured yourself are never overwritten. Each config file gets a `.skillkit-bak` copy before the first change.

The proxy `designer/scripts/studio.mjs` finds Variant Studio in this order: env `VARIANT_STUDIO_HOME` → `config.json` `variantStudio.path` → `../variant-studio` next to the skill → global skills → project skills. Check it:

```
node ~/.agents/skills/designer/scripts/studio.mjs where
```

## 4. Update

`update.bat` (Windows), `./update.sh` or `update.command` (macOS / Linux):

1. `git pull --ff-only` of this repo. If the installer itself changed, the new one runs.
2. Variant Studio, transitions.dev and the MCP entries go to their latest version.
3. Reinstall with the saved choices, no questions.

`--no-pull` (old alias `-NoSelf`) skips step 1. From inside the installed skill an agent updates with `node scripts/update.mjs`. It finds this repo from the receipt and clones it again if it is gone.

## 5. API key (only for the 21st MCP)

Never commit it, never paste it in chat.

1. https://21st.dev/settings/api-keys
2. Set the environment variable:
   - Windows: `setx API_KEY_21ST "paste_here"`
   - macOS / Linux: add `export API_KEY_21ST="paste_here"` to `~/.zshrc` (or `~/.bashrc`). On macOS, apps launched from the Dock or Finder do not read `~/.zshrc`. Also run `launchctl setenv API_KEY_21ST "paste_here"` (lasts until reboot), or start the app from Terminal.
3. Close **every** terminal and IDE: open sessions keep the old environment.

The installer never writes the key itself, only a reference in each client's own syntax:

| Client | Header value |
|---|---|
| Claude Code, Gemini CLI, Copilot | `${API_KEY_21ST}` |
| Cursor, Windsurf | `${env:API_KEY_21ST}` |
| Kilo, OpenCode | `{env:API_KEY_21ST}` |
| Codex | `env_http_headers = { "x-api-key" = "API_KEY_21ST" }` |

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
