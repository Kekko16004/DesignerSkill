---
name: visual-companion
description: Use this skill for browser-based visual collaboration when the user would understand a UI mockup, wireframe, architecture diagram, flowchart, spatial relationship, or visual side-by-side comparison better by seeing it. Use it only after the user agrees to open the visual companion. Do not use it for requirements gathering, conceptual choices, prose explanations, trade-off lists, API or data-model design, or other primarily textual work.
---

# Visual Companion

A standalone browser-based companion for visual brainstorming. It displays HTML mockups and diagrams in the user's browser, and records clicks or selections for the next conversation turn.

This is a self-contained personal Claude Code skill. Its support files live at:

```text
~/.claude/skills/visual-companion/scripts/
```

Do not require, install, invoke, or refer to the Superpowers plugin or its `brainstorming` skill.

## Decide Whether To Use It

Make the decision for each question, not for an entire session.

Use the browser only when the answer is genuinely visual:

- UI mockups, wireframes, layouts, navigation, and component composition
- System architecture, data flow, ER relationships, state machines, or flowcharts that benefit from a rendered diagram
- Side-by-side visual comparisons: design directions, themes, color palettes, hierarchy, or density
- Design polish: typography, spacing, grouping, visual hierarchy, and look and feel
- Spatial relationships or interactive selection among 2–4 visual alternatives

Stay in the terminal/chat when the content is primarily textual:

- Requirements, scope, clarifying questions, and definitions
- Conceptual A/B/C decisions expressed in words
- Pros/cons, comparison tables, technical trade-offs, API design, data models, and implementation plans
- Any question where a mockup would not materially improve comprehension

A question about UI is not automatically a visual question. “What should the wizard do?” is textual. “Which of these wizard layouts is clearer?” is visual.

## Ask Before Starting

Before starting the server, briefly state why a visual screen would help and ask for approval. For example:

> I can show three dashboard directions in an interactive browser preview, so it is easier to compare hierarchy and density. Would you like me to open the Visual Companion?

Do not start a server or open a browser until the user approves.

## Start A Session

After approval, use the current project root as the project directory. Prefer an explicit absolute path.

```bash
"$HOME/.claude/skills/visual-companion/scripts/start-server.sh" \
  --project-dir "$PWD" \
  --open
```

On Windows, run it from a shell that can execute the included `.sh` script (normally Git Bash or WSL). If the environment requires a foreground process to persist, start it through the host tool’s background/async mechanism using `--foreground`.

Capture the startup JSON and retain these values for the session:

- `url`: the full browser URL, including its `?key=...` query parameter
- `screen_dir`: directory where new HTML screens must be written
- `state_dir`: directory containing server state and user events

The key in the URL is required. Always share the complete returned `url`; never strip the query string or provide only a host and port.

Tell the user that the browser should open automatically, but provide the returned full URL as a fallback for headless or remote environments.

If the browser cannot reach a remote/container server, restart with a reachable binding as appropriate:

```bash
"$HOME/.claude/skills/visual-companion/scripts/start-server.sh" \
  --project-dir "$PWD" \
  --host 0.0.0.0 \
  --url-host localhost \
  --open
```

The project directory receives `.superpowers/brainstorm/` session artifacts. Recommend adding `.superpowers/` to the project’s `.gitignore` unless the user explicitly wants to version visual artifacts.

## Visual Iteration Loop

### 1. Verify the server before every screen

Before mentioning a live URL or writing a new screen, verify that:

- `$STATE_DIR/server-info` exists
- `$STATE_DIR/server-stopped` does not exist

If it stopped, restart with the same `--project-dir`. The session should reuse the port and the existing browser tab should reconnect. Do not claim that the server is running unless this check succeeds.

### 2. Write a fresh HTML screen

Write a new semantic `.html` file in `screen_dir`. Never overwrite or reuse a filename; the newest file is served automatically.

Examples: `dashboard-layout.html`, `dashboard-layout-v2.html`, `theme-comparison.html`, `architecture-flow.html`.

Write HTML **fragments** by default. The server will wrap them with its theme, header, connection status, helper script, and selection infrastructure. Use a complete `<!DOCTYPE html>` document only when full control is essential.

Use the available file-writing tool rather than shell `cat` or heredocs. Keep each screen focused: two to four options at most, with the question stated plainly.

### 3. Hand control to the user

At the end of the turn, include:

- The full session URL, including `?key=...`
- A one-sentence description of the displayed options
- A direct request for browser and chat feedback

Example:

> I’m showing three landing-page layouts focused on different navigation density. Open the Visual Companion at [full returned URL], review them, and click any option you prefer. Then tell me what you like or want changed here in chat.

The user’s chat feedback is primary. Browser events are supporting evidence.

### 4. Read feedback next turn

On the next turn, read `$STATE_DIR/events` when it exists. It is JSON Lines and is cleared when a new screen is pushed. Combine those events with the user’s message; do not treat the latest click as definitive when the chat message says otherwise.

If the user did not interact with the browser, rely on their written feedback.

### 5. Iterate before advancing

If feedback modifies the current decision, write a new screen with a new filename and ask again. Only advance after the current visual decision is sufficiently clear.

When the next question is textual, push a fresh waiting screen so resolved visual content does not remain misleadingly visible:

```html
<div style="display:flex;align-items:center;justify-content:center;min-height:60vh">
  <p class="subtitle">Continuing in terminal...</p>
</div>
```

## HTML Building Blocks

### A/B/C options

```html
<h2>Which layout works better?</h2>
<p class="subtitle">Consider readability and visual hierarchy.</p>

<div class="options">
  <div class="option" data-choice="a" onclick="toggleSelect(this)">
    <div class="letter">A</div>
    <div class="content">
      <h3>Single Column</h3>
      <p>Clean, focused reading experience.</p>
    </div>
  </div>
  <div class="option" data-choice="b" onclick="toggleSelect(this)">
    <div class="letter">B</div>
    <div class="content">
      <h3>Two Column</h3>
      <p>Sidebar navigation with main content.</p>
    </div>
  </div>
</div>
```

For multiple selections, add `data-multiselect` to the `.options` container.

### Design cards

```html
<div class="cards">
  <div class="card" data-choice="design-1" onclick="toggleSelect(this)">
    <div class="card-image"><!-- visual mockup --></div>
    <div class="card-body">
      <h3>Neo Noir</h3>
      <p>Dense data with sharp cyan accents.</p>
    </div>
  </div>
</div>
```

### Mockups and comparison

```html
<div class="split">
  <div class="mockup">
    <div class="mockup-header">Direction A</div>
    <div class="mockup-body">
      <div class="mock-nav">Logo | Home | Crew | Settings</div>
      <div class="mock-content">Main content</div>
    </div>
  </div>
  <div class="mockup">
    <div class="mockup-header">Direction B</div>
    <div class="mockup-body">
      <div class="placeholder">Alternative composition</div>
    </div>
  </div>
</div>
```

Available helper classes include `.options`, `.option`, `.cards`, `.card`, `.mockup`, `.split`, `.pros-cons`, `.mock-nav`, `.mock-sidebar`, `.mock-content`, `.mock-button`, `.mock-input`, `.placeholder`, `.subtitle`, `.section`, and `.label`.

## Design Standards

- Match fidelity to the decision: simple wireframes for structure, polished previews for aesthetic choices.
- Use realistic content when content affects the decision; generic placeholders can hide layout problems.
- Make the question and evaluation criterion explicit on every screen.
- Prefer legibility and a limited number of alternatives over elaborate, pixel-perfect mockups.
- Do not use the browser merely to decorate a textual answer.

## End The Session

When visual work is complete, stop the server:

```bash
"$HOME/.claude/skills/visual-companion/scripts/stop-server.sh" "$SESSION_DIR"
```

Do not delete `.superpowers/brainstorm/` automatically: it may contain useful mockup history. If the user asks to remove it, explain that it is local session output and delete only the relevant project artifacts after confirmation.
