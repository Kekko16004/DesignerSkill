# Fonts

Step 4 with no saved style. A saved style has already named its faces: do not second-guess them. Adapted from Hallmark `fonts.md` (MIT, see [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)).

**Needs:** the brief's idea, material and what the surface shows. **Gives:** `--font-display`, `--font-body`, an optional outlier, and the load rules.

## The rule

One display face and one body face, or one family for both; an optional outlier carries exactly one role (a wordmark, a headline figure, code). Choose the class the idea calls for, then two or three faces from it, and decide on the real headline set in each, by shape and colour on the page; a face's name, reputation or subject association is not a reason. Free faces unless the user has confirmed a licence; variable fonts preferred.

## Banned as a default (display)

Every model reaches for these first, so they read as unchosen. Never the **display** face by default: Inter, Roboto, Open Sans, Lato, Poppins, Source Sans, Nunito, Montserrat, Raleway, Work Sans, DM Sans, Plus Jakarta Sans, system-ui, Arial, Helvetica, Merriweather, Lora, Georgia, Courier New (or the system mono).

- A **neutral body face is fine next to a distinct display face** (e.g. a characterful serif display over a plain grotesk body). What is banned is the page carried by one of these alone.
- Allowed when the user asks for it, the saved style uses it, or the project already ships it (`existing`); say so in DESIGN.md.
- App screens may use a familiar sans or a system face for UI text; the display role (if any) still follows this list.
- `search.mjs` rows that pair these as the heading font carry `designer_flags: generic-font` and sort last; the lint cites the display rule as `[H1]`.

**Saturated** (fine faces, but the first answer: state a reason in the brief or DESIGN.md): Playfair Display, Cormorant Garamond, DM Serif Display, Fraunces, Instrument Serif, Recoleta, Space Grotesk, Hubot Sans, Bebas Neue, Unbounded as display; Geist, Instrument Sans, Mona Sans as the body or the whole page.

## Sources

- **Google Fonts.** Free, CDN, works everywhere. The default source.
- **Fontshare** (Indian Type Foundry). Free for commercial use. `<link href="https://api.fontshare.com/v2/css?f[]=<family>@<weights>&display=swap" rel="stylesheet">`.
- **A foundry** (Klim, Pangram Pangram, Production Type, Lineto, Colophon) only with a confirmed licence.

## Display faces

| Class | Faces (source) |
|---|---|
| Roman serif | EB Garamond, Cardo, Castoro, Piazzolla, Alegreya, Marcellus (Google); Gambetta, Recia (Fontshare) |
| High-contrast serif | Gloock, Libre Bodoni, Abril Fatface, Rozha One, Besley (Google); Erode, Melodrama (Fontshare) |
| Slab serif | Arvo, Hepta Slab, Domine, Alfa Slab One, Solway (Google); Bespoke Slab (Fontshare; old-style figures, so figures go in the body face) |
| Grotesk sans | Rethink Sans, Reddit Sans, Albert Sans (Google); Clash Grotesk, Supreme (Fontshare) |
| Geometric sans | Lexend, Geologica, League Spartan, Funnel Display, Afacad (Google); Satoshi, Technor, Excon (Fontshare) |
| Rounded sans | Inclusive Sans, Nunito Sans at 700 only with an argument, Varela Round (Google); Chubbo, Comico (Fontshare) |
| Condensed and heavy | Teko, Tektur, Michroma, Antonio (Google); Clash Display, Panchang, Khand, Telma, Stardom, Array (Fontshare) |
| Mono as display | Space Mono, Fragment Mono, Red Hat Mono, Spline Sans Mono, Sometype Mono (Google) |
| Pixel | Press Start 2P, VT323, Pixelify Sans, Tiny5, DotGothic16, Workbench (Google) |
| Handwritten | Shantell Sans, Caveat, Gochi Hand, Reenie Beanie (Google); Sharpie (Fontshare) |

Hallmark's list leaves out the faces its own themes use; `themes.mjs show <slug>` lists those ([knowledge.md](knowledge.md)). A theme face is fine as a seed, not as the default answer for every brief.

## Body faces

Sans: Hanken Grotesk, IBM Plex Sans, Figtree, Onest, Sofia Sans, Golos Text, Karla, Chivo, Albert Sans, Public Sans, Archivo, Manrope (Google); Switzer, General Sans, Satoshi (Fontshare). Serif: Newsreader, Source Serif 4, Literata, Spectral, Crimson Pro, EB Garamond, Piazzolla (Google); Sentient (Fontshare). Mono for code, figures, measurements: Geist Mono, JetBrains Mono, IBM Plex Mono, DM Mono, Fira Code, Azeret Mono, Chivo Mono, Overpass Mono (Google).

## The wordmark

The wordmark in nav and footer may take a different face from the body, and on tone-rich pages it should: collapsing it into the body family flattens the hierarchy. It is the outlier's one role when the page has no other:

```css
:root { --font-body: "Switzer", ui-sans-serif, system-ui, sans-serif; --font-outlier: "Gambetta", ui-serif, serif; }
.wordmark { font-family: var(--font-outlier); font-weight: 600; letter-spacing: -0.015em; }
```

One family only when the body voice is the brand (a letter, a manifesto, a long document); then the wordmark takes the family's display cut or heaviest weight. A product page whose wordmark is the body face at 600 is the un-designed default.

## Loading (web)

- Only the weights used, one `<link>` per source, `display=swap`; `<link rel="preconnect">` to the host first; preload the one critical face.
- Self-hosted `@font-face`: `font-display: swap` plus a metric-matched fallback (`size-adjust`, `ascent-override`, `descent-override`, `line-gap-override`) so the swap does not reflow the fold.
- `font-synthesis: none`; load the italic if a head uses it.
- Variable font where the family ships one.

## Other modes

- `game`: the banned display list still applies ([game-ui.md](game-ui.md) bans Inter); condensed, slab, pixel and high-contrast classes fit most worlds. Loading rules above are web-only.
- FiveM NUI: ship font files in `html/fonts/` and list them in `files{}` ([fivem-nui.md](fivem-nui.md)).
- Unity / React Native: fonts become assets (Font Asset / `expo-font` config plugin), see [translate.md](translate.md).
