# Fidelity

Two regimes. The wrong one gives either a useless mock or a broken UI.

## From scratch (`greenfield`)

New surface, no markup or data in the repo.

- Placeholders allowed: names, currencies, HP, slots, product screenshots.
- They must be **believable** for that world (not "Item 1", not Lorem).
- Layout, radius, borders, type = locked tokens. Variant Studio compares directions, not new palettes.
- After the pick: build the real mock, then QA, then translate (step 10).

## Edit / redo / polish (`existing`)

There is already HTML/CSS/JS, NUI, React, UXML, or copy/data in the project.

- **Never** replace it with placeholders.
- Read the current files. Reuse strings, icons, currencies, states, IDs, callbacks.
- Studio variants = visual forks of the real UI (same data, different hierarchy). Link the real CSS with `"head": ["/p/…"]`.
- After the pick: patch the existing files. No second "demo" mock that drifts from the product.

`existing` signals: an `index.html` already populated, React/Vue components, a FiveM `html/` folder, `config.lua` with items/jobs, Unity `.uxml`, requests like "fix / redo / clean this up / change the color".

## Mix

A new part on an existing product (e.g. a new tab in an existing garage UI): old panels stay real; only the new piece may use placeholders *from that domain* (plate, fine), never "Card Title".
