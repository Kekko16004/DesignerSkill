# Source: UI/UX Pro Max

- Repo: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Commit: `d14efff8ed1faa4187f004f79926f428c8074ec7` (2026-10-23), data v2.15.0
- Vendored: 2026-10-25
- License: MIT, Copyright (c) 2024 Next Level Builder (full text in `THIRD_PARTY_NOTICES.md` at the skill root)

## Copied

From `src/ui-ux-pro-max/data/`, byte for byte:

- `styles.csv`, `colors.csv`, `products.csv`, `ui-reasoning.csv`, `typography.csv`, `ux-guidelines.csv`, `landing.csv`, `charts.csv`, `icons.csv`, `motion.csv`, `react-performance.csv`, `app-interface.csv`
- `stacks/`: `html-tailwind.csv`, `react.csv`, `nextjs.csv`, `react-native.csv`, `shadcn.csv`, `flutter.csv`, `swiftui.csv`, `vue.csv`, `svelte.csv`, `astro.csv`

## Modified

- `google-fonts.csv`: the upstream file with one column appended, `License`, filled per family from upstream `google-font-licenses.json` (itself from google/fonts `METADATA.pb`, revision `038b637da7b3fd956a4ed93ffc607c3d5e4ce172`). All 1934 families matched. Every other byte is unchanged.

## Not copied

The Python scripts (`core.py`, `search.py`, `design_system.py`, `reasoning_contract.py`): `scripts/search.mjs` is a zero-dependency Node port of their search logic (BM25, thresholds, domain detection, rewrites, suggestions) and of a slim `design_system` brief without persistence. Also left out: the other stacks (angular, laravel, wpf, …), `catalog-summary.json`, `data-provenance.json`, `phosphor-icons-upstream.json`, templates and tests.

## Updating

Re-copy the files above from a newer commit, re-append `License` to `google-fonts.csv`, check `CSV_CONFIG` in `core.py` against `DOMAINS` in `scripts/search.mjs`, and update this file.
