# Source: Hallmark

- Repo: https://github.com/nutlope/hallmark
- Commit: `7ec868225c6caa040558c321ee0fefa0e73f83a8` (2026-10-22)
- Vendored: 2026-10-25
- License: MIT, Copyright (c) 2026 Hallmark contributors (full text in `THIRD_PARTY_NOTICES.md` at the skill root)

## Copied

From `skills/hallmark/references/`, byte for byte:

- `themes/*.md` (48 themes + `README.md`) and `themes/index.json`. The theme pictures (`*.jpg`) are not copied.
- `macrostructures.md` (the index) and `macrostructures/01-…21-*.md`
- `anatomy.md`
- `genres/editorial.md`, `genres/modern-minimal.md`, `genres/atmospheric.md`, `genres/playful.md`

## Modified

Nothing in this folder. `index.json` still points at `references/themes/<slug>.md` and `.jpg`; `scripts/themes.mjs` resolves themes by slug from this folder and ignores those paths.

## Derived, not copied

- `scripts/themes.mjs tokens <slug>` converts a theme's OKLCH `:root` to hex and maps it to designer token roles.
- `scripts/lint-slop.mjs` and `scripts/lib/slop.mjs` reimplement a subset of the gate checks of `scripts/sloplint.mjs` (gate ids cited as `[H<n>]`), the banned/saturated font lists from `references/fonts.md`, and the copy tells. `evals/fixtures/slopped.html` is adapted from `scripts/fixtures/slopped.html`.

## Updating

Re-copy the files above from a newer commit, run `node scripts/themes.mjs list` and `tokens` on a few themes, and update this file.
