# Anti-slop

A filter, not a style. If 3+ ban categories match, redo tokens and layout. Do not touch up a color.

Automated part: `node "<SKILL>/scripts/lint-slop.mjs" <files|dir> --mode <mode> [--tokens tokens.css]`. Verdict `PASS` / `PATCH` (1–2 categories) / `REDO_TOKENS` (3+, exit 2). With `--tokens` it also counts raw hex outside the locked tokens. Hits cite their source: `[H..]` Hallmark gate ([web-gates.md](web-gates.md)), `[V]` Vercel ([web-guidelines.md](web-guidelines.md)), `[NAS]` copy ([copy.md](copy.md)). Categories `a11y` and `finish` are reported and must be fixed, but do not count toward `REDO_TOKENS`. In `--mode game` / `fivem` every web rule is skipped. The lint cannot see layout or materials: the screenshot review below is still required.

## Hard bans

### Type
- A banned default as the display face, or the page carried by one alone: Inter, Geist, Roboto, Arial, Open Sans and the rest of [fonts.md](fonts.md). A neutral body under a distinct display face is fine
- Tailwind default `font-sans` on game UI
- Ultra-wide tracking on every heading
- All-caps text without an intentional display face

### Color
- Purple/indigo gradient (`from-indigo-500 to-purple-600`, `#6366f1`, `#8b5cf6`)
- "SaaS dark" palette: zinc-950 + indigo-500 + white
- Neon glow on every button
- The same accent on fill, border, text and shadow

### Shape
- `rounded-xl` / `rounded-2xl` / `rounded-3xl` on every panel
- 8px radius by default "because Tailwind"
- Pill buttons on a medieval/military HUD
- Equal-height cards in a 3-column grid

### Layout
- Hero + 3 feature cards
- 3×2 bento
- SaaS navbar (logo | links | CTA) on a HUD or inventory
- shadcn sidebar on a pause menu
- 4-column link footer on a game overlay

### Icons
- Emoji as UI icons
- Generic Lucide/Heroicons for weapons, currencies, classes
- Invented SVG paths ("sketched sword")
- Uniform 1.5px stroke icons in a painterly HUD

### Material
- Glassmorphism (`backdrop-blur-xl` + 10% white) without nested panels
- Tailwind `shadow-lg` / `shadow-xl` as the only depth
- A single flat plane for inventory/shop
- A texture named in the brief and never used

### Motion
- Bounce/elastic on diegetic popups
- Infinite shimmer on static text
- 300ms fade on everything
- Decorative particles with no function

### Copy (every mode; full rules and Edit/Detect in [copy.md](copy.md))
- Banned words: delve, foster, leverage, utilize, facilitate, empower, streamline, robust, cutting-edge, paradigm shift, game changer, tapestry, realm, beacon, multifaceted, meticulous, intricate, paramount, transformative, elevate, embark, supercharge, harness, ever-evolving, seamless, effortless, unlock, unleash, next-generation, world-class, best-in-class, industry-leading, mission-critical, future-proof, reimagine, journey
- Banned phrases: "Unlock your potential", "it's worth noting", "at the end of the day", "in today's world", "at its core", "let's dive in", "Built for the modern team", "Whether you're X or Y", "Say goodbye to", "quietly trusted by", "Click here"
- Placeholder names and clichés: Jane Doe, Acme, Nexus, Lorem, "Item 1", "Card Title"
- Fake stats and proof (10x, 99.9%, "loved by thousands", invented logos/testimonials); weasel attribution ("experts agree")
- Stock CTAs: "Get Started" in a game shop; Learn more / Get started / Book a demo as a second action
- Patterns, one line each: binary contrast ("Not X. It's Y.") · throat-clearing opener · faux-insight setup ("what nobody tells you") · colon reveal / colon title · superficial `-ing` analysis ("highlighting…") · importance puffery ("a pivotal moment") · interpretive metadiscourse ("the key point is") · weasel attribution · fake-strong verbs ("serves as") · synonym cycling · negative listing ("Not X. Not Y. Z.") · dramatic fragmentation · robotic rhythm and adjective triads · rhetorical setup ("What if I told you") · fake-profound kicker · summary-recap ending · formatting slop (emoji headings, bold mid-sentence) · em/en dashes as rhythm (**WARN only, English copy only**; Italian "–" is legitimate)
- Portability test: a line that could move unchanged to a competitor's UI is filler. Replace it with a fact only this product has

## Web floor (product-app / marketing only, never in game)

From Hallmark; ids in [web-gates.md](web-gates.md). Floor = fix before shipping.

- Every colour and `font-family` through a `:root` token; no literals past the token block (H48, H7a)
- Never `transition: all`; never animate width/height/top/left (H10a)
- Never one italic or accent-coloured word inside a heading (H38i, H38iii)
- `overflow-x: clip` on `html` and `body`; never `hidden`, never `100vw` (H34)
- Image grid tracks `minmax(0, 1fr)`; display heads `overflow-wrap: break-word; min-width: 0` (H50)
- `:focus-visible` on every interactive element, appearing instantly, 3:1 (H26a, H15)
- `prefers-reduced-motion` fallback on every animation; content visible with scripting off (H27, H62)
- No eyebrow; no tracked-caps or small-caps labels: labels are the body face a step smaller, sentence case (H54, H67)
- No middle-dot meta strings, arrows glued to link text, decorative status dots (H63)
- No card inside a card; no hand-drawn browser/OS window (H4, H47a)
- Marketing: hero head + one sentence + primary action visible at 1280×800; ~80 words per screen; container capped and centred at 1920 (H44b, H58, H44d)
- Never a fake send: no success message without a real request (H70)

## Only if the brief asks

Slop-prone aesthetics and landing patterns. `search.mjs` marks them in `designer_flags` and sorts them last. Use one only when the brief names it (or the saved style is built on it), then restyle hard on the tokens.

| Aesthetic / pattern | Flag | Tell when used by reflex |
|---|---|---|
| Glassmorphism | `glass` | Blur + 10% white over a gradient, no nested panels |
| Aurora / mesh gradient | `aurora` | Blurred colour blobs behind text (H29) |
| Bento grid / bento showcase | `bento` | 3×2 equal tiles, one icon each |
| Cyberpunk / neon | judged (often `saas-dark`) | Cyan-magenta on near-black, glow on everything (H2a) |
| Hero → features → CTA | `hero-3-cards` | The AI template (H8) |
| Elastic / spring motion | `elastic` | Overshoot on UI state (H12) |

## Product-app bans

- Unrestyled 21st components
- thinking-orbs on every spinner (thinking state only)
- iMessage bubble clone for no reason
- Four stat cards with icon tiles and unmeasured trend arrows as the screen's identity

## Marketing bans

- Purple gradient mesh
- Fake MacBook screenshots
- Invented social proof
- Three identical columns under the hero
- Ending on an email band when the job is not subscribe (H85)

## Game bans

- White cards over a 3D scene
- Ignored safe area (notch, home indicator)
- Bootstrap HP bar
- Centered SaaS-modal inventory for an AAA game (usually full-bleed or left rail)
- Touch targets < 44px on mobile

## Gate

Before code: compare the visual plan with this list.

After QA: run the lint, then look at the screenshot. If it looks like a "v0/shadcn template", count the bans. ≥3 → back to tokens. 1–2 → targeted patch inside the QA cycle.

## Distinctiveness check

Answer in one line: "This UI could belong to [title/app/site X], not to a boilerplate." If you cannot name X, it is not specific enough. With a saved style, X can be the style itself.
