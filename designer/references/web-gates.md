# Web gates

Hallmark's gates (MIT, see [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)) condensed for designer. Ids are Hallmark's numbers with an `H` prefix; `lint-slop.mjs` cites the same ids (`[H67]`). Load for `product-app` / `marketing` before tokens and again at QA.

**Scope.** Web modes only. `game` and FiveM NUI: every gate is exempt except the accessibility subset in [web-guidelines.md](web-guidelines.md) § Mode scope. `product-app` skips the page gates marked **page** (H1, H6, H8, H9, H42, H44, H46b, H58, H59, H66, H68, H77–H79, H81–H83, F8, F15, F20) and uses the app control range (H39b).

**Tiers.** **Floor** = fix before shipping. **Reflex** = a default a model falls into: fix, or keep it because the brief or the saved style demands it and say why in DESIGN.md. **Finish** = craft detail, reported, never blocks. A saved style, locked tokens and the user's own words beat a Reflex gate, never a Floor gate on access or honesty.

**Check.** M = static (lint may flag) · R = Playwright render ([playwright-qa.md](playwright-qa.md)) · J = judged by eye.

## Colour and surface

| Id | Tier | Chk | Tell | Fix |
|---|---|---|---|---|
| H2a | Floor | M | Purple→blue, purple→pink or cyan-on-dark gradient anywhere, gradient text included | One anchor hue, solid ink |
| H2b | Reflex | M | Gradient text in any other hue | Solid ink; weight or display face |
| H7a | Floor | M | `#000` / `#fff` used outside the token block | Tint toward the anchor hue |
| H7b | Reflex | M | Surface token is pure black/white (modern-minimal may keep `#fff` paper) | Tint the paper |
| H22 | Reflex | M | Zero-chroma greys on a page with an anchor hue | Tint neutrals slightly (see tokens.md OKLCH recipe) |
| H23 | Reflex | M/R | Accent past ~5% of any viewport without a declared posture | Retreat, or declare Committed / Drenched in DESIGN.md |
| H29 | Reflex | M/J | Aurora/mesh blobs, blurred orbs, chromatic halo, coloured zero-offset glow on dark | Solid or grained surface; depth by lightness and offset shadows |
| H65 | Reflex | M/J | The named look on an unthemed build: cream paper + high-contrast serif + terracotta accent | Move one axis: accent first, paper second, display last |
| H74 | Reflex | M | Framework stock swatch as a token (indigo-500, violet-600, slate-900…) unless the project already uses it | A colour mixed for this page |

## Type

| Id | Tier | Chk | Tell | Fix |
|---|---|---|---|---|
| H1 | Reflex | M | Banned default as the display face ([fonts.md](fonts.md)) | A display face from fonts.md |
| H25 | Reflex | M/R | Prose measure outside 45–75ch | `max-width: 65ch` |
| H37 | Reflex | M | More than three font families | Display, body, one outlier |
| H38i | Floor | M | One italic word inside a roman heading | Line break, or the whole head one way |
| H38iii | Reflex | M/J | The accented word: one word in a head set apart by colour, weight, highlight | Head one weight, one colour; stress by line break or a second size |
| H55a | Floor | M | Uppercase display head that can wrap with `line-height` < 1.0 | 1.02–1.08 |
| H64 | Reflex | M | Mono as costume on labels/meta when the content is not code or a figure | Body face, a step smaller |
| H67 | Floor | M | Tracked-caps label: label, caption, table head, nav link, tag ≤ 15px uppercase/small-caps or tracked > 0.03em | Body face, a step smaller, sentence case, untracked |
| H75 | Reflex | R | Running text < 12px, functional text < 11px, prose leading < 1.3 | Body 16px at 1.5–1.65 |

## Structure and layout

| Id | Tier | Chk | Tell | Fix |
|---|---|---|---|---|
| H3 | Reflex | M/R | Three equal icon-over-heading tiles; icon in a rounded tile; thick coloured side stripe on a card | Vary widths/heights, inline icons, hairline or no border |
| H4 | Floor | M | Card inside a card | One containment layer |
| H6a | Floor | M | Hero sized in `vh` | `dvh` / `svh` |
| H6b | Reflex | J | Title, lede, action, mark all on one centred axis | Max two centred elements; break one alignment |
| H8 | Reflex | J | The AI template: hero, three features, CTA, footer | Build from the job's anatomy ([marketing.md](marketing.md)) |
| H9 | Reflex | J | Every section separated the same way with the same gap | Climb different rungs of the surface ladder ([craft-web.md](craft-web.md)) |
| H24a | Floor | M | Raw padding/margin/gap where a `--space-*` token exists | The token |
| H34 | Floor | M/R | Horizontal scroll at 320–1920; `overflow-x` missing on html/body; `100vw` widths | `overflow-x: clip` on both, `width: 100%` |
| H44b | Floor | R/J | Headline, lede, primary action, visual focal point not all visible at 1280×800 | Smaller display clamp, tighter leading, trim padding |
| H44c | Reflex | R/J | At 1440×900 the next section starts above y 760 or below 900; visual far from the text | Visual beside the text; hero = exactly one screen |
| H44d | Floor | M/R | At 1920×1080 no container `max-width`, gutters < 120px, grid gains columns | Cap 1360–1520 and centre; hold column counts |
| H50 | Floor | M | Image grid track on bare `1fr`; display head without `overflow-wrap: break-word; min-width: 0` | `minmax(0, 1fr)`; `break-word` |
| H53 | Floor | M | CSS radio tabs at `position:absolute; top:0` (page jumps) | Radios in flow at zero size |
| H56 | Floor | M/R | Two `sticky; top: 0` elements | Offset the second; nav z above |
| H58 | Floor | M/R | > ~80 words in a 900px window at 1440; hero with > 2 text blocks before its actions | Headline, one sentence, actions |
| H59 | Reflex | M/R | Section gap < 120px at 1440 (64 where paper changes), or all gaps equal | ≥ 120px, varied |
| H71 | Reflex | R | Crowded head: less space above a heading than ~2× below | 2× above vs below |
| H72 | Reflex | R | Cramped box: text closer than max(8px, .5em) to a filled box's sides; prose within 8px of a phone edge | Pad; 16px gutter |
| H77 | Reflex | R | Thin section: body < ¾ container width, or no mass (no 300px visual, set of three, 3-row list/table, or statement) | Widen to 10 columns, add a visual, merge |
| H78 | Reflex | R | Median `h2` below the hero < 40px at 1440 | `h2` at `--text-section` |
| H79 | Reflex | R | > 160px dead band between hero content and the fold | Centre content, grow visual or head; never more copy |
| H80 | Reflex | R/J | Drawn illustration (inline SVG/CSS object, person, scene) past icon size | Real photo, the product, or type at scale |
| H81 | Reflex | R | Empty picture: slot or ≥300×200 gradient block showing nothing | Real image or the product built |
| H82 | Reflex | R | Counting device: ≥ 24 identical marks standing for a number | Set the number in type |
| H83 | Reflex | R | Photo wall: photos > ~⅓ of the page below the hero | Keep the strongest, carry the rest in type/tables/product |
| H84 | Reflex | J | Built fake of a product that exists and could be captured | Screenshot the real product |
| H85 | Reflex | R | Stock close: page ends on an email sign-up when the job is not subscribe/join/attend/listen/visit | End on the job's action ([marketing.md](marketing.md)) |

## Chrome and copy

| Id | Tier | Chk | Tell | Fix |
|---|---|---|---|---|
| H19 | Floor | M | Copy tells: placeholder names, startup clichés, buzzwords, rebuttal cadence ×3, filler openers, stock second action ([copy.md](copy.md)). Em/en dashes: **WARN, English only** | Say what it does, in its own nouns |
| H42 | Reflex | M | AI nav (wordmark · links · button · hairline) or AI footer (4 link columns, socials, ©) by reflex | Decide it on purpose (craft-web.md § Page), or another shape |
| H46a | Floor | M | Invented metric, testimonial, logo wall, case-study count | The user's number, a text slot, or nothing |
| H46b | Reflex | J | Bare figure as the hero's only headline | Pair it with what it means; user-supplied only |
| H47a | Floor | M | Hand-drawn browser bar (traffic lights, URL pill) or OS title bar | Real screenshot in a `<figure>`, or no chrome |
| H47b | Reflex | M | Phone/laptop/terminal frame | One frame, real content inside, or none |
| H47c | Reflex | J | Imitation material: styled-div "product UI", CSS bevels faking objects, decorative grid with nothing under it | The product built in a slot, a real asset, or nothing |
| H54 | Floor | M | Eyebrow: short inert line announcing the heading (stacked, pill, ordinal, `TRUSTED BY`) | Open the section another way (craft-web.md § Opening a section) |
| H63 | Floor | M/J | Template punctuation: `A · B · C` meta strings, `Learn more →`, decorative status dots, `WORD - fragment` | Line breaks, columns, hairlines; a verb as the label |
| H66 | Reflex | J | Decoration text: rotated labels, scroll cues, `BETA` pill in hero, weather/locale strip, `01 / 4` on tiles | Delete; a real fact becomes a caption |
| H68 | Reflex | M | Wireframe page: > 5 empty slots, or ≥ 4 in a row | Set the set in type |
| H69 | Reflex | M/J | Echo: one fact printed in ≥ 4 sections; a section ending by restating its head | Say each fact once |
| H70 | Floor | M/J | Fake send: a form prints "Sent" / "You're on the list" with no request behind it | Empty `data-endpoint`, no success state until wired |

## Motion and interaction

| Id | Tier | Chk | Tell | Fix |
|---|---|---|---|---|
| H10a | Floor | M | `transition: all`; animating width/height/top/left | List properties; `transform`, `opacity` |
| H10b | Reflex | M | Transitioning margin/padding | `transform` |
| H11 | Reflex | M/J | Same lift on every card; > 1 hover effect per element; image scales on hover; hover on non-interactive | One signal, on the container |
| H12 | Reflex | M | Bounce/overshoot easing on UI state | Exponential ease-out |
| H15 | Floor | M | Focus ring that fades in | Instant |
| H16 | Reflex | J | Celebratory toast for an effect already visible | Silent success |
| H17 | Floor | M | Tooltip focus delay = hover delay | Hover 800–1000ms, focus 0 |
| H18 | Floor | M | Auto-rotating content with no pause on hover/focus | Pause on hover/focus; visible pause control past 5 s |
| H26a | Floor | M/R | Interactive element without `:focus-visible`, ring < 3:1, outline removed with no replacement | 3:1 ring, instant |
| H26b | Reflex | M | Missing `:active` / `:disabled` | All eight states |
| H27 | Floor | M | Keyframe/transform transition without `prefers-reduced-motion` fallback | Add it |
| H28a | Floor | M | Autoplay video without `muted`; `loading="lazy"` on the LCP element | `autoplay muted loop playsinline`; `fetchpriority="high"` |
| H39a | Floor | M | Border width shifts between states; focus ring built from border; input height ≠ adjacent button; disabled by opacity alone | Constant border, `outline`, shared height, three disabled channels |
| H39b | Reflex | M | Control height outside 44–52px (marketing) / 32–40px with 44px hit target (app) | The number |
| H62 | Floor | M | Content hidden at rest (`opacity:0` reveal that needs JS) | Visible by default; hide only under `.js`, or `@starting-style` |

## Assets and access

| Id | Tier | Chk | Tell | Fix |
|---|---|---|---|---|
| H30a | Floor | M | Emoji as an icon | One icon library, real SVG, or type |
| H30b | Reflex | M | Two icon libraries on one page | One library |
| H33 | Floor | M | Decorative svg/canvas/CSS art without `aria-hidden` or a label | Hide it or name it |
| H40 | Floor | M/R | Contrast under threshold: body 4.5:1 (APCA Lc 60); large text, icons, focus rings, field edges 3:1 (Lc 45) | Fix the pair |
| H41 | Floor | M/R | Button text too close to its fill; `--accent-ink` missing where accent carries text; dark panel without swapped text; grey text on colour | The paired ink token |
| H48 | Floor | M | Colour or `font-family` literal outside the token block | Lift it into the tokens |
| H49a | Floor | M/R | Button label or primary nav link wraps at 320–1920 | Shorten; `white-space: nowrap` |
| H73 | Floor | R | Text painted under another element | Give it its own space |
| H76 | Floor | M/R | Broken image (no src, 404) | The real file |

## Finish (reported, never blocking)

F1 straight quotes · F2 `...` · F4 more than one filled-primary recipe, or two filled buttons side by side · F5 icon in a coloured coin · F6 display figures without `tabular-nums` · F7 one container recipe on 6+ selectors / pill radius on 5+ non-controls · F12 unequal flex row without `align-items: center` · F14 helper-text line without `min-height: 1lh` · F15 page invariants broken (one primary style, one container width, one gap below hero, one radius per nesting level) · F16 no `::selection` / `caret-color` / `scrollbar-color` on a committed palette · F19 more than three weights · F20 orphan item on a grid's last row · F21 skipped heading level · F22 justified without `hyphens: auto` · F23 no `lang` / `<title>` / meta description · F24 hairline border under a wide soft shadow · F25 content shown at 1440 and hidden at 375 · F26 one-word last line / stub head at 375 or 1280.

## Not ported

Hallmark's stamp (H20), waivers, pre-emit score, log/rotation (H32, the "last three builds" half of H8), theme dealing and reviewer subagents. Designer's equivalents: the anti-slop gate, the distinctiveness line, Variant Studio, DESIGN.md.
