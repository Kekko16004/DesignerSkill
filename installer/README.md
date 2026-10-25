# skillkit installer

The same installer runs [GameDeveloperSkill](https://github.com/Kekko16004/GameDeveloperSkill), [DesignerSkill](https://github.com/Kekko16004/DesignerSkill) and [GameLaunchAnalyzer](https://github.com/Kekko16004/GameLaunchAnalyzer). It is Node 18+, ESM, with zero dependencies. `install.mjs` and `lib/` are **identical in the three repos**: change one copy, then copy it to the other two. What differs per repo is `../skillkit.json` (the manifest) and `hooks.mjs`. TUI design: [DESIGN.md](DESIGN.md).

```
node installer/install.mjs install | update | doctor [--fix] | uninstall | version
  --yes (-Quiet, -All)  --hosts a,b  --only a,b  --skip a,b (-SkipModules)  --dev  --reuse  --dry-run
  --json  --verbose  --lang it|en  --no-pull (-NoSelf)  --no-color
```

## Files

| File | Role |
|---|---|
| `install.mjs` | Commands, choices, install flow, receipt, doctor, uninstall |
| `lib/term.mjs` | Color depth (24 / 8 / 4 / 1), glyph set (full / cp437 / ascii), ANSI-safe width and truncate |
| `lib/ui.mjs` | Rail UI: header, rows, multiselect, confirm, spinner task, summary card, `--json` events |
| `lib/fsx.mjs` | Paths, junctions and symlinks, `mirror` (atomic swap), `backup`, JSONC read and atomic JSON write |
| `lib/proc.mjs` | Process spawning, `which`, versions, `syncRepo` (git clone/fetch/reset, zip fallback), `pullSelf` |
| `lib/hosts.mjs` | Host table: detection, link folders, folders to clean, command folders, MCP config files |
| `lib/mcp.mjs` | MCP writers: Claude CLI, JSON / JSONC (comments kept), Codex TOML, per-client env reference syntax |

## State

- `~/.agents/skills/<name>`: canonical copy of every skill. Hosts that do not read it get a link to it (`HOSTS[*].link`).
- `~/.agents/skillkit/<id>.json`: the receipt. Fields: hosts, seenHosts, components, seen, options, and `created` = {skills, links, commands, mcp, repos}.
- `~/.agents/skillkit/repos/<owner--repo>`: managed clones.
- `~/.agents/skillkit/backup/<stamp>/`: everything the installer moved away. Each item has a `.why.txt` next to it.
- `SKILLKIT_HOME` moves the whole state folder; `SKILLKIT_GLYPHS=full|cp437|ascii` forces a glyph set; `SKILLKIT_NO_PAUSE=1` makes the `.bat` wrappers skip the final pause.

## Manifest (`skillkit.json`)

```jsonc
{
  "id": "designer", "name": "designer", "version": "3.0.0", "repo": "https://github.com/…git",
  "brand": { "mark": "[■]", "accent": "#ff6a1a", "tagline": { "it": "…", "en": "…" } },
  "hooks": "installer/hooks.mjs",
  "requires": [ { "id": "node", "min": "18", "required": true, "cmds": ["node"], "offer": false,
                  "why": {…}, "install": { "win": "winget …", "mac": "brew …", "linux": "…" } } ],
  "skills": [ { "name": "designer", "path": "designer",           // "." = the repo root is the skill
                "legacy": ["real-world-design"],                 // old names: moved to backup everywhere
                "exclude": ["install.ps1", "evals", "*.bak"],    // names or globs, at any depth
                "keep": ["config.json"],                         // per-machine files kept in the installed copy
                "include": [["tools/x", "tools/x"]] } ],         // repo files outside the skill folder
  "commands": [ { "name": "createstyle", "file": "designer/command/createstyle.md", "onlyHosts": ["gemini"] } ],
  "retiredCommands": ["design"], "commandMarker": "designer|real-world-design",
  "components": [ … ]
}
```

A command named like a skill is a duplicate wherever skills are slash commands. It is installed only for the hosts in `onlyHosts`, and removed from every other host.

Components:

| kind | Fields | Behaviour |
|---|---|---|
| `repo` | `repo`, `branch?`, `skills: "." \| "*" \| [paths]`, `exclude?`, `useLocal?: "paths.x"`, `postInstall?: [cmd, ...args]` | Clone or update to the latest commit, then mirror the skills it contains into the canonical folder. `ctx.vars[id].dir` is the clone. |
| `skillkit` | `repo` | Another skillkit product. If its receipt exists, its repo is reused (and pulled on `update`). Otherwise it is cloned. Then its own installer runs with `--yes --json --hosts …`. `SKILLKIT_CHAIN` stops loops between products that offer each other. |
| `mcp` | `mcp: { name, command, args, env } \| { name, url, headers }`, `adopt?: regex` | Written to every picked host in its format. `${env:NAME}` is never resolved, only translated to the client's reference syntax. Entries the user created are left alone unless they match `adopt`. |

Common fields: `id`, `label`, `hint`, `needs: ["cmd:uvx", "var:paths.x"]`, `env` (+ `envHelp`), `recommended: true | false | "ifLocal" | "ifInstalled"`. Values may use `${python}`, `${<id>.dir}` and `${paths.x}`; these come from `ctx.vars`.

## Hooks (`hooks.mjs`, every export optional)

| Export | When |
|---|---|
| `detect(ctx)` | After host detection. Print rows with `ctx.ui.row` and fill `ctx.vars` / `ctx.detected`. |
| `questions(ctx)` | Interactive runs only, after the module picker. Store the answers in `ctx.choices`; they are saved as receipt `options`. |
| `config(ctx, skill, dest)` | Per own skill, after the components are installed (their dirs are known). Writes per-machine files. |
| `after(ctx)` | After links, commands and MCP. Use it for checks, addons and tests (`ctx.flags`). |
| `summary(ctx, rows)` | Add rows to the summary card. Push follow-up lines to `ctx.footer`. |
| `doctor(ctx)` | Extra checks for `doctor`. Return the number of problems. |

`ctx` contains `M, ROOT, HOME, STATE, CANON, lang, T, S, flags, prev, DRY, isWin, ui, c, g, run, runSync, which, version, exists, readJson, writeJson, mkdirp, tilde, link, mirror, backup, syncRepo, vars, detected, choices, created, notes, footer, hosts, components`.

## Test in a sandbox

```bash
export USERPROFILE="$TEMP\\sk" HOME="$TEMP\\sk" SKILLKIT_NO_PAUSE=1   # Git Bash on Windows
node installer/install.mjs install --yes --hosts claude,codex
node installer/install.mjs doctor && node installer/install.mjs uninstall
```
