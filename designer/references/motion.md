# Motion

Companion: the `transitions-dev` skill (external dependency, installed by `install.bat` / `install.sh`). Adapt it to the tokens; do not copy SaaS easing onto diegetic popups.

## Budget per mode

| Mode | In | Out | Hover |
|---|---|---|---|
| game | 80–140ms, ease-out / snap | 90–160ms, no bounce | 80ms opacity/brightness |
| product-app | 160–220ms | 120–180ms | 120ms |
| marketing | 200–320ms, a single hero motion | 180–240ms | 150ms |

`prefers-reduced-motion: reduce` = no loops, no parallax, opacity only.

## Web rules (product-app, marketing; not game)

From Hallmark and Vercel (H10a, H15, H17, H18, H27; [web-gates.md](web-gates.md)).

- Never `transition: all`: list the properties. Animate `transform` and `opacity` only (blur/clip-path only if smooth on the element alone). Never width/height/top/left, never margin/padding.
- Duration tokens: `--dur-micro` 120ms (press, tick, colour) · `--dur-short` 220ms (hover, tooltip, menu) · `--dur-long` 420ms (modal, drawer, accordion, reveal). **Exits at 60–75% of the enter.** The table above bounds ordinary in/out/hover; `--dur-long` is only for large surfaces (modal, drawer, reveal).
- Easing: ease-out for arrivals, ease-in for exits, ease-in-out for toggles; never the browser's bare `ease`; `linear` only for progress; no overshoot on UI state.
- Tooltips: 800–1000ms delay on hover, **0 on focus**; peers in a group open instantly once one is open.
- Focus rings never animate. Hover is one signal per element, on the container, only inside `@media (hover: hover)`.
- Anything looping or auto-rotating past 5 s pauses on hover and focus and has a visible pause control; every loop stops off-screen and under reduced motion.
- Animations are interruptible; set the right `transform-origin`; SVG transforms on a `<g>` with `transform-box: fill-box`.
- Reveals: one per page, content visible with scripting off.

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
