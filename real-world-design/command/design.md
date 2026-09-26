---
description: Anti-slop UI pipeline (game HUD / app / landing) with real references, tokens, Variant Studio gallery, and Playwright QA
---

Load the `real-world-design` skill and run its full pipeline for: $ARGUMENTS

Do not skip mode classification, token lock, reverse engineering, anti-slop gate, Variant Studio variants, or Playwright screenshots.

Use Variant Studio (`scripts/studio.mjs`), never Visual Companion. After writing variant HTML: `node <skill>/scripts/studio.mjs wait --project <root> --timeout 1800` with tool timeout 1800000. Do not end the turn asking which variant in chat. Act on choose / revise / remix / regenerate immediately.

Greenfield may use realistic placeholders. Existing UI must stay wired to current data, icons, and copy.
