# Motion

Companion: the `transitions-dev` skill (external dependency, installed by `install.bat`). Adapt it to the tokens; do not copy SaaS easing onto diegetic popups.

## Budget per mode

| Mode | In | Out | Hover |
|---|---|---|---|
| game | 80–140ms, ease-out / snap | 90–160ms, no bounce | 80ms opacity/brightness |
| product-app | 160–220ms | 120–180ms | 120ms |
| marketing | 200–320ms, a single hero motion | 180–240ms | 150ms |

`prefers-reduced-motion: reduce` = no loops, no parallax, opacity only.

## Game

- Popup: scale 0.96→1 + fade, **no** elastic
- HUD ticks: numerics without landing bounce
- Glow: 2–3 layer `box-shadow` only on `:hover` / `:active` / selected
- Textures/panels: static. Do not animate `background-size`

## Product-app

transitions.dev fits: modal, panel, tab indicator, spinner→check, streaming text.

thinking-orbs for thinking. Pause offscreen. Theme auto.

Beautiful UI: elapsed timer on the loader, not an endless CSS spinner without context.

## Marketing

One hero motion (at most **one** component). Everything else still. Never shader + particles + infinite marquee together.

## Glow (game)

```css
.btn:hover, .btn[aria-pressed="true"] {
  box-shadow:
    0 0 0 1px var(--accent),
    0 0 12px color-mix(in srgb, var(--accent) 45%, transparent),
    inset 0 1px 0 color-mix(in srgb, white 25%, transparent);
}
```

Never Tailwind `shadow-lg` as a substitute.

## Portability

Unity USS only has named easings (`ease-out`, `ease-in-out-sine`…): `translate.mjs` maps `cubic-bezier()` to `ease-out`. Keep game motion to transitions on opacity/scale/translate/color so it survives translation; keyframe animations need C# in Unity.
