# React / Next.js (step 10)

Read when step 10 targets React (+Tailwind) or Next.js. Rule ids are from Vercel `react-best-practices` and `composition-patterns` (MIT, see [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)); only the index is vendored. Full rule text with examples: <https://github.com/vercel-labs/agent-skills/tree/main/skills>. Design rules (tokens, states, gates) still come from the rest of designer; this file is about code shape and speed.

## Translation priorities

1. Tokens stay CSS variables in the global CSS; Tailwind theme points at them (`translate.mjs tokens`). No raw hex in components.
2. Repeated class rules → components with explicit variants (see composition below), not 40-utility strings.
3. Fix CRITICAL categories first, then HIGH. Do not micro-optimise a mock.

## Performance rules by priority

| Pri | Category (prefix) | Rules |
|---|---|---|
| 1 CRITICAL | Waterfalls (`async-`) | `cheap-condition-before-await` sync checks before awaits · `defer-await` await only in the branch that uses it · `parallel` `Promise.all` for independent work · `dependencies` partial deps without serialising · `api-routes` start early, await late · `suspense-boundaries` stream with Suspense |
| 2 CRITICAL | Bundle (`bundle-`) | `barrel-imports` import directly, no barrels · `analyzable-paths` static import paths · `dynamic-imports` `next/dynamic` for heavy parts · `defer-third-party` analytics after hydration · `conditional` load modules only when the feature is on · `preload` preload on hover/focus |
| 3 HIGH | Server (`server-`) | `auth-actions` authenticate server actions · `cache-react` `React.cache()` per request · `cache-lru` cross-request LRU · `dedup-props` no duplicate RSC serialisation · `hoist-static-io` fonts/logos at module level · `no-shared-module-state` no mutable module state in SSR · `serialization` minimal props to client components · `parallel-fetching` / `parallel-nested-fetching` restructure to parallelise · `after-nonblocking` `after()` for side work |
| 4 MED-HIGH | Client fetch (`client-`) | `swr-dedup` SWR dedup · `event-listeners` dedupe global listeners · `passive-event-listeners` passive scroll · `localstorage-schema` versioned, minimal storage |
| 5 MEDIUM | Re-render (`rerender-`) | `defer-reads` · `memo` extract expensive subtrees · `memo-with-default-value` hoist default object props · `dependencies` primitive effect deps · `derived-state` subscribe to derived booleans · `derived-state-no-effect` derive in render, not effects · `functional-setstate` · `lazy-state-init` · `simple-expression-in-memo` no memo for primitives · `split-combined-hooks` · `move-effect-to-event` · `transitions` `startTransition` for non-urgent · `use-deferred-value` · `use-ref-transient-values` · `no-inline-components` never define components inside components |
| 6 MEDIUM | Rendering (`rendering-`) | `animate-svg-wrapper` animate a div wrapper, not the svg · `content-visibility` for long lists · `hoist-jsx` static JSX outside components · `svg-precision` trim coordinates · `hydration-no-flicker` inline script for client-only data · `hydration-suppress-warning` only for expected mismatches · `activity` `<Activity>` for show/hide · `conditional-render` ternary, not `&&` · `usetransition-loading` · `resource-hints` React DOM preload hints · `script-defer-async` |
| 7 LOW-MED | JS (`js-`) | batch DOM/CSS via classes · Map/Set lookups · cache property access, function results, storage reads · combine iterations, `flatMap` · length check first · early exit · hoist RegExp · loop for min/max · `toSorted()` · `requestIdleCallback` for non-critical work |
| 8 LOW | Advanced (`advanced-`) | `effect-event-deps` never put `useEffectEvent` results in deps · `event-handler-refs` · `init-once` · `use-latest` |

## Composition patterns (8 rules)

| Rule | Do |
|---|---|
| `architecture-avoid-boolean-props` | Don't add boolean props (`isCompact`, `showIcon`, `isPrimary`) to customise behaviour; compose instead |
| `architecture-compound-components` | Complex components as compound parts sharing context (`<Tabs><Tabs.List/><Tabs.Panel/></Tabs>`) |
| `state-decouple-implementation` | The provider is the only place that knows how state is managed |
| `state-context-interface` | Context exposes a generic `{ state, actions, meta }` interface (dependency injection) |
| `state-lift-state` | Move state into a provider so siblings can reach it |
| `patterns-explicit-variants` | Explicit variant components (`<PrimaryButton>`, `<GhostButton>`) instead of boolean modes; maps 1:1 to the token-driven variants from the mock |
| `patterns-children-over-render-props` | `children` for composition instead of `renderX` props |
| `react19-no-forwardref` | React 19+: no `forwardRef` (ref is a prop); `use()` instead of `useContext()`. Skip on React 18 |

## Design ↔ code checks

- Eight control states from the mock exist as real states (`:hover`, `:focus-visible`, `disabled`, `aria-invalid`, loading), not only visuals.
- Data regions render loading (skeleton matching the final shape), empty, error, full ([product-app.md](product-app.md)).
- URL holds filters, tabs, pagination (nuqs or the router).
- Motion: CSS transitions on `transform`/`opacity`; `prefers-reduced-motion` respected ([motion.md](motion.md)).
- Re-screenshot the dev server against the approved mock ([playwright-qa.md](playwright-qa.md) § After translation).
