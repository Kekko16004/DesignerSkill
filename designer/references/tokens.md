# Tokens

Define tokens **before** HTML/JSX. Start from the saved style's `tokens.css` (step 0) or from [assets/token-template.css](../assets/token-template.css). After the lock: no new hex.

Express every design decision as a `--token` (color, radius, spacing, type, shadow, motion): Variant Studio's Inspector tunes them live, `translate.mjs` carries them to every target stack, and `/createstyle` saves them.

## What to lock

1. **Ink / paper / accent / danger / rare** — 5 roles, not 12 scattered colors (add `--ink-dim`, `--paper-2` for hierarchy). Add `--accent-ink` (text on an accent fill, contrast-checked) whenever the accent carries text; web modes also `--focus` (accent hue, more chroma) and `--rule` (hairline)
2. **Radius language** — one: `0` | `chamfer` (clip-path) | `small (2–4px)` | `mixed` (panel 0, chip 999). Not a global `xl`.
3. **Border** — often double: light inside, dark outside. 1–2px, not an indigo ring-4.
4. **Type** — display + body with real names (Cinzel, IBM Plex, Newsreader, JetBrains Mono, Söhne-like alternatives…). Never Inter-only.
5. **Elevation** — 2–3 planes: inset highlight, dark drop, glow **only** on the active state.
6. **Motion** — duration and easing per mode ([motion.md](motion.md)).
7. **Density** — HUD tight; mobile app 8/12/16; marketing airier but not empty.

## Radius per world

| World | Radius |
|---|---|
| Dark fantasy / souls | 0, corner ornament or 8px chamfer |
| Sci-fi HUD | 0 or 2px, diagonal cuts |
| Casual mobile | 6–12px but not 24px on every card |
| iOS product | platform values, do not invent 16px everywhere |
| Editorial marketing | 0, or one radius only on CTAs |

## Borders from reverse engineering

Look for:
- Double border (light inside / dark outside) for depth
- 9-slice frames / corner ornaments
- 1px hairline vs a 4px accent bar only on the selected item

## Color method: OKLCH in the head, hex in the file

Tokens stay **hex** (`translate.mjs` targets USS / React Native). Reason in OKLCH, then convert each value to hex (DevTools color picker, `oklch.com`, or `themes.mjs tokens`, which already outputs hex).

1. Pick the anchor hue H from the brief / references.
2. Paper: light L 92–98, chroma 0.005–0.015 at H; dark L 12–18, chroma 0.008–0.015.
3. Ink: L 16–24 on light paper, L 88–96 on dark, chroma 0.005–0.014 at H. Never pure `#000` / `#fff` outside the token block.
4. Neutrals between (`--ink-dim`, `--paper-2`, `--rule`): same H, chroma 0.005–0.018. Zero-chroma grey next to a coloured accent reads unchosen.
5. Accent: chroma 0.12–0.22; `--accent-ink` = paper or ink, whichever passes 4.5:1 on it. `--focus`: accent hue, chroma 0.18–0.22, L within 5% of the accent.
6. Check contrast (4.5:1 body, 3:1 large/icons/rings, or APCA Lc 60 / 45), then write hex.

## Depth (web)

- Default: **one** shadow, near-invisible, tinted toward H (`0 1px 2px` ink at ~5%) or a 1px ring (`0 0 0 1px` ink at ~6%). Border **or** shadow per surface, never a hairline under a wide soft blur.
- When a surface truly floats (menu, popover, modal): layered shadow (ambient + direct) plus a crisp semi-transparent border:

```css
--shadow-float: 0 1px 2px #1a14100d, 0 8px 24px #1a141014; /* hex+alpha, tinted ink */
--border-float: 1px solid #1a14101f;
```

- Radii: one per nesting level, concentric: `inner = outer − padding` (≥ 2px). An 8px card with 6px padding holds 2px children.
- Game keeps its own depth (double border, inset highlight, glow on active): the rules above are web-only.

## Text over busy scenes

HUD and 3D overlays: scrim (`linear-gradient` or semi-solid panel) + a crisp `text-shadow`. Never white text straight on gameplay.

## Expected output (before markup)

```
tokens:
  style: kfdev (saved) | none
  mode: game
  ink: #...
  paper: #...
  accent: #...
  radius: chamfer-8
  border: 1px #c9b896 inside / 2px #1a1208 outside
  display: Cinzel
  body: Source Serif
  motion: 90ms / 140ms, ease-out
```

## Portability

Prefer values every target can express: plain hex/rgb, px, named easings. `color-mix()`, `env()`, `clamp()` and `cubic-bezier()` are fine on the web; `translate.mjs` flattens them for USS/React Native and reports what it dropped.
