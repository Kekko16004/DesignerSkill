# Evals

Run these after changing the skill (in a scratch project, one chat each), or feed them to the `skill-creator` eval loop. Each line under **Pass** must hold; any **Fail** item fails the case.

Automatic part for every case: `node designer/scripts/lint-slop.mjs <output files> --mode <mode> --tokens <tokens.css>` must not return `REDO_TOKENS`.

## 1. Website, no game words

`/designer landing page for an independent bookbinding studio`

- Pass: mode `marketing`; one direction written before code; tokens before markup; Variant Studio opened with 3–8 variants; DESIGN.md written; output plain HTML or React.
- Fail: mode `game`; hero + 3 cards; Inter-only; indigo; studio opened before tokens.

## 2. Phone app

`/designer onboarding flow for a habit-tracker app, iOS feel, React Native`

- Pass: `product-app`; 2–3 real apps named; studio `--kind page --viewports mobile`; 390×844 screenshots; `translate.mjs rn` + `tokens` run and the report addressed.
- Fail: desktop sidebar squeezed to mobile; touch targets < 44px; no translation step.

## 3. Saved style by first word

Setup: `/createstyle testnoir dark editorial, cream paper #f3ead8, ink #1b1712, red accent #b3261e, Fraunces headlines, square corners` (must not read the project).

`/designer testnoir pricing page`

- Pass: `styles.mjs match` → `first-word`; tokens copied from the style; one line saying the style is applied; DESIGN.md names the style and lists deviations.
- Fail: new palette invented; style ignored; project files scanned during `/createstyle` with a description.

## 4. Style mentioned mid-prompt + typo

`/designer make the account page using the testnoir style` → `matched_by: mention`.
`/designer testnior account page` → asks "did you mean testnoir?" once.

## 5. Game UI → Unity

`/designer inventory screen for a souls-like, desktop, Unity UI Toolkit`

- Pass: `game`; Game UI Database / Interface In Game (if enabled) or the library note; radius 0/chamfer; double borders; studio `page` + `desktop`; no 390 screenshot; `translate.mjs uitk` output in `Assets/UI/...` with the report items handled; library note saved.
- Fail: shadcn cards; emoji icons; mobile breakpoint; hand-written UXML without the mock.

## 6. FiveM only when asked

`/designer garage menu for my FiveM server (ox_lib, QBCore)`

- Pass: fivem-nui.md applied: transparent body, `SendNUIMessage`/`RegisterNUICallback` wiring, ESC closes and releases focus, dev shim for browser QA, 1920×1080 + 21:9 checks.
- Fail: phone layout; opaque full-screen body; CDN-only fonts without note.

`/designer garage page for a car rental website` must **not** load fivem-nui.md.

## 7. Existing UI

In a project with a populated `index.html`: `/designer redo the header, it looks cheap`

- Pass: `existing`; real copy/icons/links kept; studio variants link the project CSS via `/p/...`; patch applied to the real files.
- Fail: Lorem/placeholder copy; a separate demo file instead of a patch.
