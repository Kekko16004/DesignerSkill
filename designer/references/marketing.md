# Marketing

Websites, landings and promo surfaces. One direction, then at most one catalog block.

## Before any kit

Write 4 lines:

1. Promise (one)
2. Material / era (editorial, brutalist, neon, paper…)
3. Type pairing
4. What it is **not** (no purple SaaS, no 3 cards)

## Sources

- 1–2 real sites with the same tone (not 10) — or the saved style
- Component Gallery only to name the component (hero, pricing, navbar)
- Aceternity only if the brief explicitly asks for landing motion. High slop risk (bento, shaders, indigo): restyle hard or skip
- 21st: parts (navbar, pricing) restyled

## Minimum structure

A hero with real hierarchy (display type, one CTA). Then **one** proof band (feature, quote, or demo), not three cloned cards. Pricing only if asked.

## Anatomy and shape

- Name the visitor's **job** (subscribe, book, visit, attend, buy, try, sign up, hire, join, listen) and read its part of `<SKILL>/data/hallmark/anatomy.md`: where the action lives, the category's own sections (the menu, the lineup, the issues), how real sites end. Build from that, not from figures + steps + email band.
- Then design the page and name its shape from the 21 page shapes in `<SKILL>/data/hallmark/macrostructures/` (read only the one you land on). Hero postures, compositions and section openings: [craft-web.md](craft-web.md).
- **Never end on an email band** unless the job is subscribe (or join/attend/listen with a recurring list, or the user asked). End on the job's action: the booking, the buy box, the download, the next date and address, the latest issue (H85).
- Copy: [copy.md](copy.md). Gates: [web-gates.md](web-gates.md).

## Banned

Hero + 3 cards + indigo gradient + fake logos + MacBook mockup + "Unlock your potential".

## Output

Mock, then plain HTML (`translate.mjs html`) for a static site, or React+Tailwind for an app-based site.
