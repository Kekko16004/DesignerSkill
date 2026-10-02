# Translate the approved preview (step 10)

The approved Variant Studio variant / HTML mock is the spec. Translate it to the target stack named in the brief.

## Pick the route by complexity

| Situation | Route |
|---|---|
| Static site, simple page | `translate.mjs html` (standalone page) or keep the mock |
| Simple/medium UI, new code | `translate.mjs <target>` first pass, then fix the report |
| Project already has components/design system | Rewrite by hand with the project's components; use `translate.mjs tokens` only |
| Heavy `::before/::after` ornaments, gradients, complex grid, canvas/WebGL | Rewrite by hand (the automatic pass would lose too much); keep the mock open side by side |

Whatever the route: tokens stay the single source of truth, and the result is screenshot-compared with the mock when the stack can render.

## Script

```
node "<SKILL>/scripts/translate.mjs" <target> <variant.html | tokens.css> [--css extra.css ...] [--out dir] [--name Name]
```

Studio fragments pick up `<round>/_shared.css` and `.variant-studio/global.css` automatically, plus `<style>` blocks and local `<link>`s. Every lossy step is listed in `<out>/<Name>.report.md` — fix each item or consciously accept it.

| Target | Output | Notes |
|---|---|---|
| `html` | `Name.html` | Standalone page with all CSS inlined. Websites, FiveM NUI base, quick shares. |
| `react` | `Name.jsx` + `Name.css` | Attribute conversion (className, htmlFor, style objects). Replace static copy with props/state. Tailwind: use the tokens theme below rather than rewriting to utilities blindly. |
| `rn` | `Name.tsx` | React Native: View/Text/Pressable/Image/TextInput/ScrollView + StyleSheet from single-class rules (descendant/pseudo selectors are reported). Tokens inlined as literals. |
| `uitk` | `Name.uxml` + `Name.uss` + icons `.svg` | Unity UI Toolkit. Tags → `ui:VisualElement` / `ui:Label` (rich text for b/i) / `ui:Button` / `ui:TextField` / `ui:Toggle` / `ui:Slider` / `ui:DropdownField` / `ui:ProgressBar` / `ui:ScrollView` (overflow auto). `id` → `name`. CSS → USS: flex row default restored, grid → row+wrap, gap → child margins, color-mix/calc/clamp flattened, rem/em → px, text-transform applied to label text, font weight/style → `-unity-font-style`, unsupported things reported (box-shadow, gradients, filters, pseudo-elements, media queries, z-index). |
| `tokens` | `.tokens.json`, `.tailwind.js`, `.tokens.uss`, `.tokens.ts`, `.tokens.dart`, `.tokens.swift` | From `:root` custom properties (+ dark overrides). Tailwind theme references the CSS variables. |

## Per stack

### Plain HTML / website
`translate.mjs html`, then move the `<style>` to the site's CSS file if it has one. Replace studio `/p/...` paths with real paths.

### React + Tailwind (web app, landing)
`translate.mjs react` for structure, `translate.mjs tokens` → merge `.tailwind.js` into `theme.extend`, keep the `:root` block in the global CSS. Convert repeated class rules to components, not to 40-utility strings. Never default shadcn colors.

### React Native / Expo (phone app)
`translate.mjs rn` + `translate.mjs tokens` → replace literals with `.tokens.ts` constants. Load fonts (expo-font). Gradients → `expo-linear-gradient`. Shadows: iOS `shadow*` + Android `elevation`. Safe areas: `react-native-safe-area-context`.

### Flutter / SwiftUI
No automatic markup pass: `translate.mjs tokens` gives `ThemeData` colors (`.tokens.dart`) or a `Color` enum (`.tokens.swift`); rebuild the widget tree by hand following the mock.

### Unity UI Toolkit (default for games, used by GameDeveloperSkill)
1. `translate.mjs uitk <approved variant> --name MainMenu --out "<UnityProject>/Assets/UI/MainMenu"`.
2. Fix the report: Font Assets → `-unity-font-definition` on `.t-body`; images/SVG → import as Sprite / Vector Image and fix `url("project://database/Assets/...")`; shadows/gradients/ornaments → 9-slice sprites or extra elements; media queries → swap USS from C# by resolution.
3. Wire behaviour in C#: `root.Q<Button>("play").clicked += …` (ids became `name`).
4. Screenshot the Game view (Unity MCP) and compare with the mock.

### Unity UGUI (legacy Canvas)
No stylesheet: use `.tokens.json` (colors, sizes) in a theme ScriptableObject and rebuild the hierarchy following the mock (the `ui-ugui` skill if installed). Prefer UI Toolkit for new menus.

### FiveM NUI
`translate.mjs html` (or keep the mock), then follow [fivem-nui.md](fivem-nui.md): transparent body, message/callback wiring, dev shim.

## Make previews translatable

When the target is not the web: real child elements instead of `::before/::after` ornaments, flex over complex grid, solid colors or sprite-ready gradients, transitions instead of keyframes, ids on interactive elements (they become `name`s / handlers).
