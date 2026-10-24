# Knowledge base (search.mjs, themes.mjs)

Vendored data: ui-ux-pro-max CSVs (`data/uupm`) and 48 Hallmark themes (`data/hallmark/themes`). Web modes only (`product-app`, `marketing`); never in `game` / FiveM. Results are **seeds**: they never override a saved style, locked tokens or the anti-slop gate. Inside designer, uupm "styles" are called **aesthetics** ("style" = a saved identity). Never write uupm's `MASTER.md` / design-system persistence; DESIGN.md and `/createstyle` are the only persistence.

## When

| Step | Use |
|---|---|
| 3, no library note | `search.mjs "<product> <keywords>" --domain product\|landing\|ux` for patterns and UX rules |
| 4, no saved style | `themes.mjs match "<brief>"` → `show <slug>` → `tokens <slug>` (hex, designer roles); or `search.mjs brief "<product>"` for a `:root` draft. Then lock **your own** tokens |
| 4, type | `search.mjs "<mood>" --domain typography\|google-fonts`, filtered through [fonts.md](fonts.md) |
| 7–8, a specific concern | one `--domain` (`ux`, `chart`, `icons`, `gsap`) with 2–5 terms, one intent |
| 10 | `search.mjs "<component or issue>" --stack <target>` (react, nextjs, react-native, shadcn, flutter, swiftui, html-tailwind…) |

```
node "<SKILL>/scripts/search.mjs" "<query>" [--domain …] [--stack …] [-n 5] [--json] [--full] [--raw]
node "<SKILL>/scripts/themes.mjs" list [--family editorial|modern-minimal|atmospheric|playful] | match "<brief>" | show <slug> | tokens <slug>
```

## Reading results

- `designer_flags` (`indigo-brand`, `generic-font`, `glass`, `aurora`, `bento`, `hero-3-cards`, `elastic`, `saas-dark`): a flagged row is slop-prone and sorts last. Use it only if the brief explicitly asks for that look ([anti-slop.md](anti-slop.md) § Only if the brief asks).
- Verify fit before use. Empty or off-topic → retry once narrower, then continue without it.
- A theme lends palette, type voice, radius and surfaces, never layout. No private project data in queries.
