# Web interface guidelines

Vercel Web Interface Guidelines (MIT, see [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)). Rules below are verbatim from `command.md` except: the Title Case rule is dropped (STYLE.md / [copy.md](copy.md) decide case) and designer notes are marked *(designer: …)*. Load at step 8 and whenever patching existing web code. Lint cites these as `[V]`.

Review output: group by file, `file:line - finding`, terse; no preamble.

## Mode scope

| Mode | Applies |
|---|---|
| `product-app` (web) | Everything |
| `marketing` | Everything; Hydration Safety only for React/Next |
| `product-app` → React Native | Accessibility intent, Forms intent, Content & Copy; the rest via [react-native.md](react-native.md) |
| `game` (Unity, HTML HUD) | Pure accessibility only: contrast (H40, H41), text ≥ 12px (H75), redundant status cues (never colour alone), meaningful labels on icon-only controls in menus |
| FiveM NUI (`game` + CEF) | The `game` row, plus: visible instant focus when the NUI takes keyboard/gamepad focus (H26a, H15), labelled form controls, never block paste, Escape closes. Everything else exempt (no reduced-motion, safe-area, i18n, SEO, zoom rules) |

## Rules

### Accessibility

- Icon-only buttons need `aria-label`
- Form controls need `<label>` or `aria-label`
- Interactive elements need keyboard handlers (`onKeyDown`/`onKeyUp`)
- `<button>` for actions, `<a>`/`<Link>` for navigation (not `<div onClick>`)
- Images need `alt` (or `alt=""` if decorative)
- Decorative icons need `aria-hidden="true"`
- Async updates (toasts, validation) need `aria-live="polite"`
- Use semantic HTML (`<button>`, `<a>`, `<label>`, `<table>`) before ARIA
- Headings hierarchical `<h1>`–`<h6>`; include skip link for main content
- `scroll-margin-top` on heading anchors
- Meaningful media needs captions, transcripts, or descriptions as applicable
- Media controls need keyboard support; decorative media needs assistive-tech hiding

### Focus States

- Interactive elements need visible focus: `focus-visible:ring-*` or equivalent
- Never `outline-none` / `outline: none` without focus replacement
- Use `:focus-visible` over `:focus` (avoid focus ring on click)
- Group focus with `:focus-within` for compound controls
- Sticky headers/footers/overlays must not cover the focused element

### Forms

- Inputs need `autocomplete` and meaningful `name`
- Use correct `type` (`email`, `tel`, `url`, `number`) and `inputmode`
- Never block paste (`onPaste` + `preventDefault`)
- Labels clickable (`htmlFor` or wrapping control)
- Disable spellcheck on emails, codes, usernames (`spellCheck={false}`)
- Checkboxes/radios: label + control share single hit target (no dead zones)
- Submit button stays enabled until request starts; spinner during request
- Errors inline next to fields; focus first error on submit
- Placeholders end with `…` and show example pattern
- `autocomplete="off"` on non-auth fields to avoid password manager triggers
- Warn before navigation with unsaved changes (`beforeunload` or router guard)

### Animation

- Honor `prefers-reduced-motion` (provide reduced variant or disable)
- Animate `transform`/`opacity` only (compositor-friendly)
- Never `transition: all`—list properties explicitly
- Set correct `transform-origin`
- SVG: transforms on `<g>` wrapper with `transform-box: fill-box; transform-origin: center`
- Animations interruptible—respond to user input mid-animation
- Autoplay motion >5 seconds alongside other content needs pause, stop, or hide controls
- Muted decorative loops must stop under `prefers-reduced-motion`

### Typography

- `…` not `...`
- Curly quotes `“` `”` not straight `"`
- Non-breaking spaces: `10&nbsp;MB`, `⌘&nbsp;K`, brand names
- Loading states end with `…`: `"Loading…"`, `"Saving…"`
- `font-variant-numeric: tabular-nums` for number columns/comparisons
- Use `text-wrap: balance` or `text-pretty` on headings (prevents widows)

### Content Handling

- Text containers handle long content: `truncate`, `line-clamp-*`, or `break-words`
- Flex children need `min-w-0` to allow text truncation
- Handle empty states—don't render broken UI for empty strings/arrays
- User-generated content: anticipate short, average, and very long inputs

### Images

- `<img>` needs explicit `width` and `height` (prevents CLS)
- Below-fold images: `loading="lazy"`
- Above-fold critical images: `priority` or `fetchpriority="high"`

### Performance

- Large lists (>50 items): virtualize (`virtua`, `content-visibility: auto`)
- No layout reads in render (`getBoundingClientRect`, `offsetHeight`, `offsetWidth`, `scrollTop`)
- Batch DOM reads/writes; avoid interleaving
- Prefer uncontrolled inputs; controlled inputs must be cheap per keystroke
- Add `<link rel="preconnect">` for CDN/asset domains
- Critical fonts: `<link rel="preload" as="font">` with `font-display: swap`
- Prefer `<video autoplay muted loop playsinline>` over animated GIF; provide a still alternative
- Short non-essential loops: Safari H.264 MP4 `<picture>` source, `prefers-reduced-motion` media condition, and still fallback

### Navigation & State

- URL reflects state—filters, tabs, pagination, expanded panels in query params
- Links use `<a>`/`<Link>` (Cmd/Ctrl+click, middle-click support)
- Deep-link all stateful UI (if uses `useState`, consider URL sync via nuqs or similar)
- Destructive actions need confirmation modal or undo window—never immediate

### Touch & Interaction

- `touch-action: manipulation` (prevents double-tap zoom delay)
- `-webkit-tap-highlight-color` set intentionally
- `overscroll-behavior: contain` in modals/drawers/sheets
- Page rubber-band suppression: `overscroll-behavior: none` on `<html>` inside `@media (pointer: fine)`; keep coarse-pointer page defaults for pull-to-refresh. Test hybrid touch devices: `pointer` describes the primary input, and `none` also disables scroll chaining and native swipe navigation
- During drag: disable text selection, `inert` on dragged elements
- Drag/swipe/pinch/path gestures need tap/click and keyboard alternatives unless essential
- `autoFocus` sparingly—desktop only, single primary input; avoid on mobile

### Safe Areas & Layout

- Full-bleed layouts need `env(safe-area-inset-*)` for notches
- Avoid unwanted scrollbars: `overflow-x-hidden` on containers, fix content overflow *(designer: on `html`/`body` use `overflow-x: clip`, never `hidden`, see H34)*
- Flex/grid over JS measurement for layout

### Dark Mode & Theming

- `color-scheme: dark` on `<html>` for dark themes (fixes scrollbar, inputs)
- `<meta name="theme-color">` matches page background
- Native `<select>`: explicit `background-color` and `color` (Windows dark mode)

### Locale & i18n

- Dates/times: use `Intl.DateTimeFormat` not hardcoded formats
- Numbers/currency: use `Intl.NumberFormat` not hardcoded formats
- Detect language via `Accept-Language` / `navigator.languages`, not IP
- Brand names, code tokens, identifiers: wrap with `translate="no"` to prevent garbled auto-translation

### Hydration Safety

- Inputs with `value` need `onChange` (or use `defaultValue` for uncontrolled)
- Date/time rendering: guard against hydration mismatch (server vs client)
- `suppressHydrationWarning` only where truly needed

### Hover & Interactive States

- Buttons/links need `hover:` state (visual feedback)
- Interactive states increase contrast: hover/active/focus more prominent than rest

### Content & Copy

- Active voice: "Install the CLI" not "The CLI will be installed"
- Numerals for counts: "8 deployments" not "eight"
- Specific button labels: "Save API Key" not "Continue"
- Error messages include fix/next step, not just problem
- Second person; avoid first person
- `&` over "and" where space-constrained

*(designer: the upstream "Title Case for headings/buttons" rule is intentionally dropped.)*

### Anti-patterns (flag these)

- `user-scalable=no` or `maximum-scale=1` disabling zoom
- `onPaste` with `preventDefault`
- `transition: all`
- `outline-none` without focus-visible replacement
- Inline `onClick` navigation without `<a>`
- `<div>` or `<span>` with click handlers (should be `<button>`)
- Images without dimensions
- Large arrays `.map()` without virtualization
- Form inputs without labels
- Icon buttons without `aria-label`
- Hardcoded date/number formats (use `Intl.*`)
- `autoFocus` without clear justification
- Animated GIF when compressed video is suitable
- Gesture-only action without tap/click and keyboard alternative

## Design (README, condensed)

| Item | Rule |
|---|---|
| Layered shadows | At least two layers (ambient + direct light) when a surface needs elevation; recipe in [tokens.md](tokens.md) |
| Crisp borders | Combine a semi-transparent border with the shadow for edge clarity |
| Nested radii | Child radius ≤ parent, concentric (`inner = outer − padding`) |
| Hue consistency | On non-neutral backgrounds tint borders, shadows and text toward the same hue |
| Contrast | Prefer APCA over WCAG 2 for perceptual contrast (body Lc 60, large/UI Lc 45) |
| Interactions increase contrast | `:hover`, `:active`, `:focus` more contrast than rest |
| Hit targets | Visual target < 24px → expand hit area to ≥ 24px; mobile ≥ 44px |
| Mobile inputs | `<input>` font-size ≥ 16px on mobile (no iOS zoom); never disable zoom instead |
| Loading states | Show-delay ~150–300ms, minimum visible ~300–500ms; loading buttons keep their label |
| Stable skeletons | Skeletons mirror the final content exactly (no layout shift) |
| Optimistic updates | Update at once when success is likely; on failure roll back or offer Undo |
| Browser chrome | `color-scheme` and `theme-color` match the page |
| Text and transforms | Animate a wrapper, not the text node, to avoid smoothing shifts |
| Gradient banding | Avoid fading to dark with CSS masks; use a background image |
| Charts | Colour-blind-safe palettes; never colour alone |
| Tooltip timing | First tooltip in a group delayed (800–1000ms, H17), peers instant; focus 0 |
