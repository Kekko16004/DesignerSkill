---
description: Anti-slop UI pipeline (game HUD / app / landing) with real references, tokens, Variant Studio gallery, and Playwright QA
---

Load the `real-world-design` skill and run its full pipeline for: $ARGUMENTS

Do not skip mode classification, token lock, reverse engineering, anti-slop gate, Variant Studio variants, or Playwright screenshots.

Use Variant Studio from the `variant-studio` skill installed next to `real-world-design` (`<skill>/../variant-studio/scripts/studio.mjs`). If it is missing, recommend installing it and, once the user agrees, run `<skill>/scripts/install-variant-studio.bat` (see `references/companion.md`). After writing variant HTML: `node <studio.mjs> wait --project <root> --timeout 1800` with tool timeout 1800000. Do not end the turn asking which variant in chat. Act on choose / revise / remix / regenerate immediately.

Greenfield may use realistic placeholders. Existing UI must stay wired to current data, icons, and copy.
