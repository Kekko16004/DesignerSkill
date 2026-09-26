# Motion

Companion: skill `transitions-dev` (`npx skills add Jakubantalik/transitions.dev`). Adatta i token, non copiare easing SaaS su popup diegetici.

## Budget per mode

| Mode | In | Out | Hover |
|---|---|---|---|
| game | 80–140ms, ease-out / snap | 90–160ms, no bounce | 80ms opacity/brightness |
| product-app | 160–220ms | 120–180ms | 120ms |
| marketing | 200–320ms, un solo hero motion | 180–240ms | 150ms |

`prefers-reduced-motion: reduce` = niente loop, niente parallax, opacity only.

## Game

- Popup: scale 0.96→1 + fade, **no** elastic
- HUD tick: numerics senza bounce da landing
- Glow: `box-shadow` a 2–3 strati solo su `:hover`/`:active`/selected
- Texture/pannelli: statici. Non animare `background-size`

## Product-app

transitions.dev va bene per: modal, panel, tabs indicator, spinner→check, streaming text.

thinking-orbs per thinking. Pause offscreen. Theme auto.

Beautiful UI: elapsed timer sul loader, non spinner CSS infinito senza contesto.

## Marketing

Un movimento hero (Originkit **un** componente). Il resto fermo. Niente shader + particles + infinite marquee insieme.

## Glow (game mandate)

```css
.btn:hover, .btn[aria-pressed="true"] {
  box-shadow:
    0 0 0 1px var(--accent),
    0 0 12px color-mix(in srgb, var(--accent) 45%, transparent),
    inset 0 1px 0 color-mix(in srgb, white 25%, transparent);
}
```

Non `shadow-lg` Tailwind come sostituto.
