---
description: Anti-slop UI pipeline (website / phone app / game UI) with saved styles, real references, tokens, Variant Studio, Playwright QA, DESIGN.md and stack translation. Usage: /designer [style] <request>
argument-hint: "[style-name] <what to design>"
---

Load the `designer` skill and run its full pipeline for: $ARGUMENTS

1. Step 0 first: `node <skill>/scripts/styles.mjs match "$ARGUMENTS"`. If the first word (or an explicit mention in the request) is a saved style, apply it: read its STYLE.md + tokens.css and treat them as the locked identity. If ambiguous or a likely typo, ask once. If none, continue without a style.
2. Default to website or phone app. Game UI only when the request is about a game; FiveM/NUI rules only when FiveM/NUI is named.
3. Do not skip mode, brief, reverse engineering (library first), token lock, anti-slop gate, Variant Studio, QA (studio audit + lint-slop + Playwright), DESIGN.md, translation to the target stack.
4. Variant Studio via the proxy `<skill>/scripts/studio.mjs` (run `where`, then follow the variant-studio SKILL.md for commands). After writing the variants: `node <skill>/scripts/studio.mjs wait --project <root> --timeout 1800` with tool timeout 1800000. Never end the turn asking for the pick in chat; act on choose / revise / remix / regenerate immediately.
5. Greenfield may use realistic placeholders. Existing UI stays wired to current data, icons and copy.
