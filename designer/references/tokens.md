# Tokens

Define tokens **before** HTML/JSX. Start from the saved style's `tokens.css` (step 0) or from [assets/token-template.css](../assets/token-template.css). After the lock: no new hex.

Express every design decision as a `--token` (color, radius, spacing, type, shadow, motion): Variant Studio's Inspector tunes them live, `translate.mjs` carries them to every target stack, and `/createstyle` saves them.

## What to lock

1. **Ink / paper / accent / danger / rare** — 5 roles, not 12 scattered colors (add `--ink-dim`, `--paper-2` for hierarchy)
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
