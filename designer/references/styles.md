# Saved styles

A **style** is a reusable visual identity (tokens + explained rules + reference screenshots) stored once and shared by every agent that has this skill installed.

Store: `$DESIGNER_HOME` or `~/.designer/` (`styles/<slug>/`, `library/`). Every installed copy of the skill also has a `styles` link pointing there. `node "<SKILL>/scripts/styles.mjs" home` prints the paths.

```
~/.designer/styles/<slug>/
  STYLE.md        the style explained (from assets/style-template.md)
  tokens.css      locked :root custom properties (+ dark overrides if any)
  tokens.json     generated: translate.mjs tokens tokens.css --out <dir> --name tokens
  meta.json       name, slug, aliases, mode, summary, source, dates
  screenshots/    reference captures of the source UI (optional)
```

## Using a style (`/designer <style> …`)

1. `styles.mjs match "<full arguments>"` — first word that equals a style slug/name/alias wins (`/designer kfdev login page`). Otherwise it looks for mentions in the prompt ("with the kfdev style", "stile kfdev", "like kfdev", or the bare name). Results:
   - `style` → apply it (below). Strip nothing else: `prompt` is the request without the style word.
   - `ambiguous` → ask once which of `candidates`.
   - `suggestions` → likely typo; ask once.
   - nothing → no style. Do not invent one.
2. Read `STYLE.md` fully, `tokens.css`, and look at `screenshots/`.
3. Tokens are locked from `tokens.css`. Extend only for needs the style does not cover (e.g. a `--danger` it lacks) and keep the extension consistent with its rules; mention extensions in DESIGN.md.
4. The style's `mode` is the default mode; the brief wins if it clearly names another surface.
5. Its do/don't list joins the anti-slop gate. QA compares against its screenshots.

## Creating a style (`/createstyle [name] [description]`)

Two routes. Decide from the arguments, never both:

### A. Described — the user writes the style

Arguments contain a description ("dark editorial, cream paper, red accent, Fraunces + Inter Tight, square corners…"), or the user says to just create it as described.

- **Do not read or scan the project.** The folder may be empty; that is fine.
- Turn the description into tokens + STYLE.md. Fill gaps with choices consistent with the description and mark them `(inferred)` in STYLE.md.
- Ask **only** if something essential is truly unclear or contradictory (one short message, max 3 questions). Mood words alone are enough to decide.
- `styles.mjs init <name> --described [--mode m] [--alias a,b]`.

### B. Extracted — from the current project

No description (bare `/createstyle` or just a name), and the project has UI.

1. `styles.mjs init <name> --source "<project>" [--mode m]`.
2. `node "<SKILL>/scripts/extract-style.mjs" "<project>"` → stack, custom properties (by usage), color/font/radius/shadow/spacing/motion frequencies, entry files.
3. Read the entry files it lists (global CSS, tailwind config, layout/App, main screens). Separate the real system from noise (one-off colors, vendor CSS).
4. If the UI can run (dev server, `index.html`, Storybook), take 2–4 Playwright screenshots of representative screens into `screenshots/`.
5. Write `tokens.css` with the **project's own variable names** where they exist, plus the role aliases (`--ink`, `--paper`, `--accent`, …) mapped onto them, so the style works both inside and outside that project.
6. Write STYLE.md: explain the identity, not just list values.

If the project has no UI and no description was given → ask for a description (route A).

### Name

- First argument if it looks like a name (one word / slug, not a sentence): `/createstyle kfdev`.
- Otherwise derive it (package.json `name`, project folder) and say which name you used.
- Existing name → update it in place (`init` keeps `created`), unless the user asked for a new one.

### Finish

1. `node "<SKILL>/scripts/translate.mjs" tokens "<dir>/tokens.css" --out "<dir>" --name tokens` (tokens.json + other formats).
2. Update `meta.json`: `summary` (one line), `mode`, `aliases`.
3. Reply: name, one-line summary, path, and usage `/designer <slug> <request>`.

## Other commands

`styles.mjs list` · `show <name>` · `remove <name>` (only when the user asks) · `lib list` · `lib path <title>`.
