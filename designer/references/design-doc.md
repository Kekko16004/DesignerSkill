# DESIGN.md and the reference library

## DESIGN.md (step 9, every run)

A plain-text explanation of the design, written so another agent (or a human) can rebuild or extend the UI without the conversation.

- Location: project root `DESIGN.md`; if the project keeps docs in `docs/`, use `docs/DESIGN.md`. FiveM: next to `fxmanifest.lua`. Unity: `Assets/UI/DESIGN.md`.
- Template: [assets/design-template.md](../assets/design-template.md). Fill every section; delete a section only if it truly does not apply.
- Existing DESIGN.md → update it: add a new `## Surface: …` section for a new screen, edit tokens in place (with a changelog line), never duplicate.
- Explain **why**, not only what: which reference each choice came from, which alternatives were rejected in Variant Studio and why (from the decision notes).
- Tokens section = the exact locked `:root` block (copy, do not paraphrase).
- If a saved style was used: name it and list only the deviations.
- Translation section: target stack, files produced, what the `.report.md` flagged and how it was solved.

Then, if the identity is new and reusable, offer once: "Save it as a global style? `/createstyle <name>`". When the user accepts, route B of [styles.md](styles.md) can read this DESIGN.md as the primary source.

## Reference library (step 3)

Reverse-engineering findings are expensive; keep them.

- `node "<SKILL>/scripts/styles.mjs" lib path "<game/app/site>"` → one Markdown file per title in `~/.designer/library/`.
- Before browsing: if it exists, read it and only browse for the missing surface.
- After browsing: append a section:

```markdown
## <Surface> — <date>
Sources: <urls>
- Anchors / layout: …
- Panels / borders / radius: …
- Type: …
- Color roles: ink … paper … accent …
- States: …
- Motion: …
- Notes / gotchas: …
```

Facts only (measured or clearly visible), no opinions. Never store screenshots of copyrighted UI in the repo; the library lives in the user's home.
