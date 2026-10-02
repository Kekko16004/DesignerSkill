# Anti-slop

A filter, not a style. If 3+ ban categories match, redo tokens and layout. Do not touch up a color.

Automated part: `node "<SKILL>/scripts/lint-slop.mjs" <files|dir> --mode <mode> [--tokens tokens.css]`. Verdict `PASS` / `PATCH` (1–2 categories) / `REDO_TOKENS` (3+, exit 2). With `--tokens` it also counts raw hex outside the locked tokens. The lint cannot see layout or materials: the screenshot review below is still required.

## Hard bans

### Type
- Inter, Geist, Roboto, Arial, Open Sans as the only font
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

### Copy
- "Unlock your potential", "next-generation", "seamless", "elevate"
- Fake stats (10x, 99.9%, "loved by thousands")
- "Get Started" CTA in a game shop

## Product-app bans

- Unrestyled 21st components
- thinking-orbs on every spinner (thinking state only)
- iMessage bubble clone for no reason

## Marketing bans

- Purple gradient mesh
- Fake MacBook screenshots
- Invented social proof
- Three identical columns under the hero

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
