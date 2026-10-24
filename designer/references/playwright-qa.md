# Visual QA

Mandatory after the first mock. Max 3 Playwright cycles. Then stop or redo the tokens.

## Pass 0 — studio audit (free)

The Variant Studio decision carries an `audit` array for the selected variant(s): contrast, touch targets (mobile/tablet), missing alt/labels, horizontal overflow. Fix **all** of them in the implementation before the first screenshot. It does not count as a cycle.

## Pass 1 — lint

```
node "<SKILL>/scripts/lint-slop.mjs" <mock files or dir> --mode <mode> --tokens <tokens.css>
```

`REDO_TOKENS` → back to step 4. `PATCH` → fix the listed hits. `PASS` → screenshots.

## Setup

1. Write the mock to disk (project folder, or `.variant-studio/` export).
2. Open it with Playwright: absolute `file:///` or a local preview server.
3. Never judge from code alone.

## Cycle

1. `browser_navigate` to the mock.
2. `browser_resize` 1440×900. `browser_take_screenshot` (+ fullPage for landings).
3. `browser_snapshot` — names, roles, clickable targets.
4. States: `browser_hover` CTAs, `browser_click` tabs/modals, disabled visible.
5. **Only if platform is `mobile` or `both`:** `browser_resize` 390×844, screenshot. Check thumb zone, notch padding, clipped text, 44px targets. Skip for FiveM/NUI and PC/console HUDs.
6. Compare with [anti-slop.md](anti-slop.md) and the reference screenshots (or the saved style's screenshots).
7. **Web modes only** (`product-app`, `marketing`; skip for `game` / FiveM): the measured checks below.

## Measured checks (web modes)

One batched `browser_evaluate` per viewport; gate ids in [web-gates.md](web-gates.md).

| Check | Viewports | Pass | Gate |
|---|---|---|---|
| No horizontal scroll: `document.documentElement.scrollWidth <= innerWidth` | 320, 375, 1440, 1920 | true at all four | H34 |
| Hero fits: headline, lede, primary action `getBoundingClientRect().bottom <= innerHeight` | 1280×800 (marketing) | all inside | H44b |
| Container capped: main container width at 1920 | 1920×1080 | ≤ 1520px, centred | H44d |
| Focus visible: `browser_press_key` Tab ×5, then read `getComputedStyle(document.activeElement)` | 1440 | outline/box-shadow not `none`, no fade transition | H26a, H15 |
| Text size: smallest rendered `font-size` among visible text nodes | 1440, 375 | ≥ 12px (functional labels ≥ 11px) | H75 |
| Words per screen: visible words in each 900px window | 1440×900 (marketing) | ~80 or fewer | H58 |
| Button labels: every `button, [role=button], nav a` has a single line (`height` ≈ one `line-height`) | 320, 1440 | none wrap | H49a |

```js
// browser_evaluate starter: overflow + smallest text + wrapped buttons
() => {
  const vis = el => { const r = el.getBoundingClientRect(); return r.width && r.height; };
  const sizes = [...document.querySelectorAll('body *')].filter(e => vis(e) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
    .map(e => parseFloat(getComputedStyle(e).fontSize));
  const wrapped = [...document.querySelectorAll('button,[role=button],nav a')].filter(vis).filter(b => {
    const s = getComputedStyle(b), lh = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.2;
    return b.getBoundingClientRect().height - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom) > lh * 1.6;
  }).map(b => b.textContent.trim().slice(0, 40));
  return { hScroll: document.documentElement.scrollWidth > innerWidth, minFont: Math.min(...sizes), wrapped };
}
```

Any failure is a QA finding for the current cycle; it does not cost an extra cycle.

## Fail → patch

| Symptom | Action |
|---|---|
| Flat / SaaS | Nested panels, double border, material tokens |
| Broken gradient | Replace with tokens; no indigo |
| Missing texture | Layered CSS gradients / SVG frame, not stock photos |
| No hover | Glow/inset from motion.md |
| Broken mobile | Safe area, stacking, body font-size ≥ 14px |
| Odd icons | Real SVG, remove invented paths |
| Off-style (saved style) | Diff against STYLE.md do/don't and its screenshots |

Reload, screenshot again. Cycles 2 and 3 only on failure.

## Pass

Lint `PASS`/`PATCH` resolved, < 3 bans by eye, distinctiveness line answered, hit targets ok. Then DESIGN.md (step 9) and translation (step 10).

In `existing`, screenshots must show the product's real data (plates, jobs, currencies, copy), never studio placeholders.

## After translation

If the target can render (React dev server, plain HTML, React Native web, Unity Game view screenshot via MCP), screenshot it once and compare with the approved mock. Differences listed in the `.report.md` are expected; anything else is a bug.

## Agentation

If a React preview exists the user may annotate there. It does not replace Playwright screenshots. Skip on plain HTML.
