---
description: Save a reusable global design style, either described by you or extracted from the current project. Usage: /createstyle [name] [description]
argument-hint: "[name] [optional description of the style]"
---

Load the `designer` skill, read `references/styles.md`, and create (or update) a global style from: $ARGUMENTS

- Name: the first argument if it is a single name-like word; otherwise derive it from the project (package.json name or folder) and say which one you used.
- If the arguments contain a description of the style (or the user says to just create it as described): build it **from the description only**. Do not read or scan the project; an empty folder is fine. Ask only if something essential is unclear (one short message).
- If there is no description: extract the style from the current project (`scripts/extract-style.mjs`, entry files, screenshots of the running UI). If there is no UI to read, ask for a description.
- Write `STYLE.md` (from `assets/style-template.md`, explaining the identity, not just values) and `tokens.css` into the folder returned by `scripts/styles.mjs init`, generate `tokens.json` with `scripts/translate.mjs tokens`, fill `meta.json` (summary, mode, aliases).
- Reply with the name, a one-line summary, the folder, and how to use it: `/designer <name> <request>`.
