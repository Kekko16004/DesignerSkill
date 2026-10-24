# React Native / Expo (step 10)

Read when step 10 targets React Native or Expo, after `translate.mjs rn` + `translate.mjs tokens`. Condensed from Vercel `react-native-skills` (MIT) and ui-ux-pro-max `pro-rules.md` (MIT); see [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md). Tokens come from `.tokens.ts` as hex; never re-type literals.

## Version gate (check `package.json` first)

| Feature | RN ≥ 0.76 with New Architecture | Otherwise |
|---|---|---|
| Shadows | `boxShadow: '0 2px 8px rgba(…)'` string (layered allowed) | iOS `shadowColor/Offset/Opacity/Radius` + Android `elevation` |
| Gradients | `experimental_backgroundImage: 'linear-gradient(…)'` only on a version whose changelog lists it (newer than 0.76) | `expo-linear-gradient` |
| Filters | `filter` (New Arch) | Skip, or a pre-rendered image |

Unsure of the version or architecture → use the fallback column; report it in DESIGN.md translation notes.

## Rules

| # | Rule | Why |
|---|---|---|
| 1 | `borderCurve: 'continuous'` with every `borderRadius` | iOS-smooth corners, matches the mock better |
| 2 | `gap` on the parent for space between, `padding` for space within; no sibling margins | Mirrors the mock's flex gaps and `--space-*` tokens |
| 3 | `StyleSheet.create` (or Nativewind) outside render; no inline style objects in lists | Stable references, fewer re-renders |
| 4 | Few font sizes: take the mock's type roles, add hierarchy with weight and `--ink-dim`, not a new size per label | Keeps the locked scale |
| 5 | Fonts via the `expo-font` config plugin (embedded at build), not `useFonts` at runtime | Available at launch, no blank first frame |
| 6 | Every string inside `<Text>`; no falsy `&&` (`{count && …}` renders `0`), use ternaries | Crash / stray "0" |
| 7 | Lists: FlashList or LegendList, never `ScrollView` + `map`; memoised items, stable callbacks, item types for mixed rows | Memory and mount time |
| 8 | Images: `expo-image`, sized, cached | Speed, no layout jump |
| 9 | Animate only `transform` and `opacity` (Reanimated; `useDerivedValue` for computed values) | UI-thread smooth; same rule as [motion.md](motion.md) |
| 10 | Press: `Pressable` (or `Gesture.Tap` inside gesture handlers), never `TouchableOpacity`; pressed feedback within 80–150ms via opacity/colour, no layout shift | Responsive feel |
| 11 | Hit targets ≥ 44×44pt iOS / 48×48dp Android; expand with `hitSlop` when the glyph is smaller | Touch accuracy |
| 12 | Safe areas: `contentInsetAdjustmentBehavior="automatic"` on the root ScrollView; `contentInset` + `scrollIndicatorInsets` for dynamic bars; `react-native-safe-area-context` for fixed headers/tab bars | No content under notch or home indicator |
| 13 | Native navigators (native stack, native tabs) and native modals (`presentationStyle="formSheet"`) over JS sheets | Gestures and accessibility for free |
| 14 | Native context menus (`zeego` / platform menus) over custom popovers | Platform-correct |
| 15 | Measure with `onLayout`, never `measure()` in render | Avoids layout thrash |
| 16 | Accessibility: `accessibilityRole`, `accessibilityLabel` on icon-only controls, `accessibilityState` for selected/disabled; focus order = visual order; contrast 4.5:1 body / 3:1 icons, in both themes | Same floor as the web |
| 17 | Disabled = native `disabled` + reduced emphasis + no action; never a control that looks tappable and does nothing | Honest states |

## From the mock

- CSS `box-shadow` layers → the version-gate table; glow on dark is still banned ([anti-slop.md](anti-slop.md)).
- Descendant / pseudo selectors in the `.report.md` → explicit child components with their own styles.
- `::before/::after` ornaments → real `<View>`s.
- Keyboard: composer uses `KeyboardAvoidingView` or `react-native-keyboard-controller`.
- Re-screenshot (Expo web or simulator) against the approved mock.
