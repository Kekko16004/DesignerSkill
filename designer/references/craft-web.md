# Craft (web)

Numbers for `product-app` and `marketing` surfaces, from Hallmark craft + layout (MIT, see [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)). Load before tokens and at QA, with [web-gates.md](web-gates.md). Never in `game` / FiveM: those use [game-ui.md](game-ui.md) and [fivem-nui.md](fivem-nui.md). A saved style's tokens win over every number here; these fill what the style does not decide. App screens: read [product-app.md](product-app.md) § App screens first; it overrides the page rules below.

## Type

- Two families max: display + body (one family may do both). A third only as an **outlier** with exactly one role (wordmark, headline figure, code). Faces: [fonts.md](fonts.md).
- Three weights max across the page, picked as extremes (400 / 700, 300 / 800).
- Scale: 1.25 ratio from a 16px body (marketing); 1.125–1.2, no fluid heads (app).

| Role | Token | At 1440 |
|---|---|---|
| Hero head (`h1`) | `--text-display` | 84px (poster: `clamp(4rem, 10vw, 9rem)`) |
| Long hero head, statement | `--text-display-s` | 60px |
| Section head (`h2`) | `--text-section` | 52px (never < 40, H78) |
| Item title (`h3`) | `--text-title` | 25px |
| Lead | `--text-lead` | 21px |
| Body | `--text-md` | 16px minimum |
| Label, caption, meta | `--text-sm` | 14px |

- Display: tracking -0.02 to -0.04em (0 to -0.015em on condensed/heavy); line-height 1.0–1.15, tighter as it grows; uppercase that can wrap ≥ 1.0. One weight, one style, one colour per head.
- Headline by rendered length: ≤ 20 chars full display · 21–50 display · 51–90 display-s or `<br>` at the sense break · > 90 rewrite. Check every `<br>` at 375.
- Heading measure on the element: `h1` 20ch, `h2` 30ch, `h3` 40ch. Body 45–75ch, line-height 1.5–1.65 (prose pages 1.65–1.75, 60–75ch).
- Labels, captions, table heads, tags, nav links: body face, one step smaller, sentence case, untracked (H67). Mono only for code or figures (H64).
- Required: `font-display: swap`, `font-synthesis: none`, `tabular-nums` on compared figures, `text-wrap: balance` on heads and `pretty` on body, curly quotes, `…`, `&nbsp;` in unit pairs.

## Colour

Method in [tokens.md](tokens.md) (OKLCH reasoning, hex output). Layers: paper, ink, 5–9 tinted neutrals between, one accent with a paired `--accent-ink`, a focus colour on the accent's hue.

- Accent is a signal, not a fill: < 5% of any viewport (active nav, focus ring, primary control, the one series a chart argues from).
- Postures (declare in DESIGN.md if not Restrained): **Restrained** (above) · **Committed** (one colour carries 30–60% of the surface as a surface token; accent stays a signal) · **Full palette** (3–4 named roles, each with a job) · **Drenched** (the surface is the colour).
- Contrast: body 4.5:1 (target 7:1) or APCA Lc 60; large text, icons, rings, field edges 3:1 or Lc 45. A rule that paints a dark surface swaps its text colour in the same rule. No grey text on colour.
- Bans: gradients past three stops, purple-blue/pink, cyan-on-dark, glow on dark, alpha as a colour's definition (alpha is for overlays and shadows), red/green as the only signal. Dark mode is derived, never inverted.

## Space and canvas

- Spacing scale: `--space-3xs` 2 · `2xs` 4 · `xs` 8 · `sm` 12 · `md` 16 · `lg` 24 · `xl` 40 · `2xl` 64 · `3xl` 96 · `4xl` 144. Max three optical nudges off-scale. `gap` for siblings, `margin` only to break flow.
- Container: `--container` 1440, `--gutter` 64 → content 1312px, held at 1920 while gutters grow (cap 1360–1520, H44d). Twelve columns, `--gap-columns` 32.
- Section outer element owns background + block padding; inner `.container` owns width and `padding-inline` only.
- Section gaps: 120 / 144 / 176px, mixed (H59); a band of changed paper takes 120 top and bottom. Space is earned by mass.
- Head block: `h2` + at most one lead line, on columns 1–6/1–7 (or head 1–5, lead 7–12). Head→line 16–24px; head block→content 48–64px. Grid items 32 across, 48–64 down; card padding 32–40.
- Grids: CSS Grid for the page, Flexbox inside components; shrinking flex children `min-width: 0`; no orphan on a last row (F20).

## Surfaces and depth

- Surface ladder, climb different rungs at different seams (H9): whitespace → hairline (1px `--rule`) → tinted well (`--paper-2`, no border) → card (border **or** shadow, never both; only for independently interactive content). Never white cards on a tinted page, a card in a card, a bordered box inside a well.
- One shadow at most per surface, near-invisible: e.g. `0 1px 2px` ink at 5%, or a `0 0 0 1px` ring at 6%. Elevated is never darker than its canvas. Layered recipe in tokens.md.
- Radii: one per nesting level, concentric (`inner = outer − padding`, ≥ 2px).
- z scale: base 1 · raised 10 · dropdown 100 · sticky 200 · sticky-nav 300 · modal 400 · toast 500 · tooltip 600.
- `overflow-x: clip` on html and body (never `hidden`, never `100vw`).

## Motion

Tokens: `--dur-micro` 120ms (press, tick, colour) · `--dur-short` 220ms (hover, tooltip, menu) · `--dur-long` 420ms (modal, drawer, accordion, reveal). Exits 60–75% of the enter. Full rules: [motion.md](motion.md).

- Hero entrance: one settle, 0.4–0.8s including stagger, from a visible default (fade + 8px rise = one motion). Never bounce, starfield, mouse parallax, auto-carousel.
- One reveal per page, visible without JS (H62). Stagger 30–50ms rows, 60–100ms blocks, 500ms total max.
- Never: parallax, custom cursors, pulsing dots, marquee that won't pause, `will-change` on a class.

## Hero postures (marketing)

Pick from the job, write it in DESIGN.md, vary it run to run. Text beside a picture (Settled, Stage) is the most generated hero: use it only when the picture is the strongest thing.

| Posture | Height | Content |
|---|---|---|
| Settled | fills screen under nav | text on 6 cols, visual on 6, centred |
| Stage | fills screen | text on 5, visual on 7 at 60–75% screen height, may bleed off the edge |
| Banner | 50–60% | first section shows above the fold (docs, utilities) |
| Ledge | fills screen | tall field above, head resting at the base |
| Corridor | fills screen | one centred column ≤ 44ch, head larger than usual |
| Poster | 92–100dvh | full-bleed photo/canvas, content on its calmest part |
| Counter | fills screen | the action is the visual: buy box, booking times, subscribe + latest issue |
| Index | fills screen | the list is the visual: lineup, menu, issues |

- Text: head ≤ 7 words, one sentence at `--text-lead`, one or two actions. All visible at 1280×800 (H44b).
- Visual: 6–7 columns and ≥ 60% screen tall (520px at 1440×900), centre within 60px of the text block; grid `6fr 5fr` / `5fr 7fr`, gap 48–120px. No visual → head at display cap across 8–12 columns, or Banner.
- Space under the content 1.0–1.5× the space above; lowest content within 160px of the fold.

## Compositions (one line each)

A page uses 3–6, never the same twice in a row. **Split** text + visual on 6–12, ≥ 440px · **Showcase** head, one 16:9–21:9 visual across 12 cols · **Grid** 3–4 items with real pictures/figures, ≥ 240px · **Bento** 4–6 tiles in mixed spans, one lead (only if the brief asks, see anti-slop.md) · **Rows** 3–5 hairline rows (FAQ, index, price list) · **Table** 4–5 rows, tabular numerals · **Figures** 3–4 user-given numbers · **Steps** a real `<ol>` for a real process · **Statement** one sentence over 8–10 cols, once · **Band** change of paper holding the job's action · **Form** fields on 6–7 cols beside the head · **Rail** horizontal run cut by the edge, snap · **Pinned** sticky visual + 3–4 panels · **Switcher** 2–5 real states behind a segmented control · **Index** 6–20 dense rows · **Schedule** time × place/day · **Offer** product, options, price, action.

Under 60rem everything stacks in reading order; nothing scrolls sideways except a rail or a labelled table.

## Opening a section (12 ways, never an eyebrow)

Ask what the reader does not yet know. 1 nothing, heading flush · 2 the heading announces itself (usually best) · 3 a heavier lead-in inside the paragraph · 4 one drop cap per page · 5 a rule that does more (hairline, double rule, colour edge) · 6 a real numeral at graphic scale, once · 7 a real `<ol>` · 8 a caption below instead of a label above · 9 marginalia · 10 a change of paper · 11 a running head / folio · 12 a persistent sticky heading. Two may share a section; three is noise.

## Page (marketing)

- Shape: the job decides the anatomy ([marketing.md](marketing.md) → `<SKILL>/data/hallmark/anatomy.md`). Page shapes: 21 named macrostructures in `<SKILL>/data/hallmark/macrostructures/`; design the page first, then name the shape; read only the one file you land on.
- 6–9 sections including hero and footer (5 on a thin brief). Dense section → quiet section. Photos ¼–⅓ of the page below the hero, never two photo-led sections in a row.
- Steps only for a real process; a figure row only for three numbers the user stated.
- Nav: one line, 56–80px, the job's action word (Book, Tickets, Start free). Vary it: edge-aligned, floating pill, masthead, slab, search-led, three-part bar only for 4+ real destinations.
- Footer 200–400px: mast, statement, colophon, letter close; four link columns only for a real sitemap.
- Close on the job, not a form (H85).

## Controls and finish

- One filled primary per page (dialogs count as their own page); secondaries outlined or typographic. Two button sizes max, ≥ 6px apart.
- Heights: marketing 44–52px; app 32–40px with a 44px hit target (48 on coarse pointers). Input height = adjacent button.
- Eight states on every control: default, hover (inside `@media (hover: hover)`), `:focus-visible` (instant, 2px outline, offset 2, 3:1), active, disabled (opacity .55 + `not-allowed` + native attribute), loading (label stays, width fixed), error (colour + message + `aria-invalid`), success (from a real response only).
- Inputs: constant border width, ring is an `outline`, helper line reserves `min-height: 1lh`, 16px on mobile, `name` + `autocomplete` + right `type`/`inputmode`, label above (never placeholder-as-label), paste never blocked.
- Loading: spinner after 150–300ms, shown ≥ 300ms; skeleton where the shape is known.
- Pricing: emphasise a tier with its button and a word, never a different card colour; buttons aligned at the bottom.
- Tables: sentence-case heads that never wrap, horizontal rules only, no outer card; on phone keep the naming and acting columns in view.
- Document: `lang`, a real `<title>`, one-sentence meta description, heading levels step by one, every `<img>` has `width`/`height`.
