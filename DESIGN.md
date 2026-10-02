# Design: designer (skill brand)

> Written by the designer skill. Updated 2026-10-02. Another agent can rebuild or extend the brand from this file alone.

## Brief

- Surface(s): logo mark, app icon, wordmark lockup (GitHub avatar, README header, favicon, skill galleries)
- Mode: marketing
- Platform: both — must read from 16px to 512px, on paper and on ink
- Fidelity: greenfield
- Target stack: SVG (source) + PNG exports
- Saved style: none

## References

- Variant Studio 2.0 (sister tool): OLED black, orange accent `#ff6a1a`, square components — shared palette so the two read as one family.
- Teenage Engineering marks: utilitarian geometry, no ornament.
- Swiss / print production: crop marks, brackets, swatches — "real references, not invention".

## Direction

A bracket pair that becomes a lowercase **d**: the left bracket is short, the right one rises into the d's ascender, and the accent square sits where the counter would be. It reads at once as `[■]` (design as code: tokens, variants, picks) and as `d` (designer). Ink on paper, square corners, one accent. It is deliberately **not** a pen nib, a palette, a sparkle or a gradient app-icon.

## Tokens

```css
:root {
  --ink: #0b0b0b;
  --ink-dim: #6b675f;
  --paper: #f2efe8;
  --line: #d9d4c8;
  --accent: #ff6a1a;
  --radius: 0px;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
}
```

| Token | Rationale |
|---|---|
| `--ink` / `--paper` | Print pair; paper is warm, not white, so the mark never looks like a SaaS default |
| `--accent` | Same orange as Variant Studio: family link; used only for the square |
| `--radius: 0` | Anti-slop: no rounded app-icon look |
| `--font-mono` | Wordmark in IBM Plex Mono 600 lowercase, tagline 500 uppercase tracked |

## Geometry (viewBox 0 0 64 64)

- Left bracket: `M7 24h15.5v5H12v26h10.5v5H7z` (5-unit stroke as a filled shape)
- Right bracket / ascender: `M52 4h5v56H41.5v-5H52z`
- Accent square: `x22 y31 w20 h22`
- App icon: mark at `translate(8 8) scale(0.75)` on an ink square, so every edge lands on whole pixels at 512px.
- Lockup: mark 64 high, wordmark at x 78, cap height aligned to the bracket top, tagline under it.

## Files

| File | Use |
|---|---|
| `assets/brand/mark.svg` | Mark for light backgrounds |
| `assets/brand/mark-dark.svg` | Mark for dark backgrounds |
| `assets/brand/icon.svg`, `icon-512.png` | App icon / GitHub avatar / favicon source |
| `assets/brand/lockup-light.svg/.png`, `lockup-dark.svg/.png` | README header and banners (PNG embeds the real font; SVG falls back to the system monospace) |

## Decisions (Variant Studio)

- Round 1 (`Designer skill / Logo #1`): six directions — crop marks, variant stack, pick grid, square d, token chip, bracketed swatch. User combined **D (square d)** and **F (bracketed swatch)**.
- Round 2 (#2, parent #1): bracket = d, outline d, d in brackets. User approved **A "Bracket = d"** ("Mi piace").
- Rejected: pick grid (generic at small sizes), variant stack (busy at 16px), token chip (too close to a Pantone chip).

## Do / Don't

- Do: keep the accent only on the square; use `mark-dark` on ink; keep clear space ≥ 1/4 of the mark height.
- Don't: round the corners, add gradients or shadows, recolor the brackets orange, stretch the mark, set the wordmark in another font.

## Translation

SVG is the source. PNGs rendered with Playwright at 1x from the SVGs with IBM Plex Mono loaded. For a favicon, use `icon.svg` directly or downscale `icon-512.png`.

## Changelog

- 2026-10-02: initial mark, icon and lockups
