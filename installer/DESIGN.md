# Design: skillkit installer (terminal UI)

> Written by the designer skill. Updated 2026-10-25. Same file in GameDeveloperSkill, DesignerSkill and GameLaunchAnalyzer.

## Brief

- Surface: one terminal application. It covers detection, host and module choice, install with progress, and a summary card.
- Mode: product-app (developer tool). Platform: desktop terminal. Fidelity: greenfield.
- Must run in Windows Terminal, legacy conhost (Consolas), VS Code, macOS Terminal, Linux, CI logs and piped output.
- References:
  - create-astro / clack: steps on a vertical rail.
  - Charm gum: restrained color.
  - Claude Code: a dim secondary text tone.
  - The DesignerSkill brand: ink, paper, one orange accent and the `[■]` mark.

## Direction (Variant Studio round `001-installer-tui`)

There were three directions: A, square panels; B, a vertical rail; C, a two-pane dashboard. **B is the base.** It scrolls like a log, so the run stays readable after it ends. It needs no alternate screen, it degrades to ASCII in CI, and it does not break in narrow windows. C was rejected because the alternate screen loses the log and the layout breaks below 100 columns. A's boxes are kept for the closing summary card only.

## Tokens (`lib/term.mjs`)

| Token | Value | Use |
|---|---|---|
| fg | `#e8e4da` | body text (warm paper, never pure white) |
| dim | `#8a857a` | values, hints, help lines |
| faint | `#55524a` | the rail, box borders, things that were not found |
| accent | per product: designer `#ff6a1a`, game-developer `#3fc98a`, game-launch-strategist `#8f7cf6` | active prompt, cursor, selected boxes, spinner, the mark's center |
| ok / warn / err | `#7bc47f` / `#e0b04a` / `#e5604f` | state glyphs only, never whole lines |
| info | `#79a7d8` | reserved |

Each color is converted once for the terminal: truecolor in Windows Terminal, VS Code and COLORTERM, xterm-256 otherwise, ANSI 16 in old consoles, none for NO_COLOR or pipes. Bold is the only weight.

## Glyphs (three sets, picked automatically, forced with `SKILLKIT_GLYPHS`)

| Role | full | cp437 (conhost) | ascii (CI / pipe) |
|---|---|---|---|
| rail top / line / end | `┌ │ └` | `┌ │ └` | `+ \| +` |
| step done / active | `◆ ◇` | `● ○` | `* o` |
| checkbox on / off | `◼ ◻` | `■ □` | `[x] [ ]` |
| cursor | `❯` | `►` | `>` |
| task ok / fail / skip | `✓ ✗ –` | `√ x -` | `ok x -` |
| spinner | braille, 80 ms | `\| / - \` | none (one final line) |

## Layout

```
  [■] designer  tagline                                            v3.0.0 · rev
┌  Section
│
◆  Label          value  dim note                 ← detection rows, label column 14
◇  Prompt?  help                                  ← multiselect, collapses to "◆ Prompt  a, b" on enter
│  ❯ ◼ Item           hint
│  ✓ task label         note                 0.4s ← task column 20, time only when ≥ 0.3s
└  footer
┌─ Summary · name version ───────────────────────┐   ← the only box
│ key        value                               │
└────────────────────────────────────────────────┘
  follow-up commands, one per line
```

- Rules:
  - No line is wider than the terminal. Redrawn lines are cut with `…` and keep their color, so the cursor-up count stays correct.
  - Hosts that were not found and skipped modules use the faint tone. Errors color only their glyph and note.
  - The `[■]` mark is drawn as `[■]` / `[▲]` / `[▶]`. It becomes `[■]` in cp437 and `[#]` in ASCII.
  - All text is in Italian or English, picked by the system locale or `--lang`.

## Do / don't

- Do keep a single accent per product, keep everything on one rail, and print a final line for every task.
- Don't add emoji, gradients, ASCII-art logos, full-screen takeover, color on whole lines, or a spinner when output is piped.
