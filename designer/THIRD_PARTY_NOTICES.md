# Third-party notices

Designer vendors knowledge from the MIT-licensed projects below. Their text and data were adapted, not linked: nothing here is fetched or executed from those repositories at runtime. Common modifications for every source: condensed and rewritten in designer's voice; colour values converted from OKLCH to hex where tokens are produced; every web-only rule made exempt in `game` mode and FiveM NUI except the accessibility subset named in `references/web-guidelines.md`; designer's own pipeline (saved style, locked tokens, anti-slop gate) takes precedence over any vendored rule.

## 1. no-ai-slop

- Repository: https://github.com/petergyang/no-ai-slop
- Commit: `000650b156983f5159695b441477f4e63b25dc85` (2026-09-01)
- License: MIT. Copyright (c) 2026 Peter Yang
- Used in: `references/copy.md`, `references/anti-slop.md` (Copy), `[NAS]` rules in `scripts/lint-slop.mjs`
- Modifications: adapted from general prose editing to UI and landing copy; Edit / Detect modes kept (Detect: quote + fix, no score); em/en dash rule downgraded to a warning and limited to English copy; UI copy table added.

## 2. Hallmark

- Repository: https://github.com/nutlope/hallmark
- Commit: `7ec868225c6caa040558c321ee0fefa0e73f83a8` (2026-10-22)
- License: MIT. Copyright (c) 2026 Hallmark contributors
- Used in: `references/web-gates.md`, `references/craft-web.md`, `references/fonts.md`, `references/anti-slop.md` (Web floor), `references/copy.md`, `references/tokens.md`, `references/motion.md`, `references/product-app.md`, `references/marketing.md`, `references/playwright-qa.md`; `data/hallmark/**` (themes, macrostructures, anatomy, genres), `scripts/themes.mjs`, `[H..]` rules in `scripts/lint-slop.mjs`
- Modifications: gates condensed to one table keeping Hallmark's numbers (`H` prefix); the CSS stamp, waivers, pre-emit score, build log / rotation, theme dealing, scaffold and reviewer machinery removed; theme tokens converted OKLCH → hex in designer role names; font ban applied to the display face only (a neutral body face is allowed beside a distinct display face); dash rule downgraded to an English-only warning; game / FiveM exempt.
- Photographs: Hallmark's photo library references images hosted on Wikimedia Commons, each under its own licence (CC0, public domain, CC BY, CC BY-SA). Designer does **not** redistribute those photographs or the photo index.

## 3. Vercel agent-skills

- Repository: https://github.com/vercel-labs/agent-skills
- Commit: `063bee94c3f4df8453406c830b0a7df0f2860278` (2026-08-28)
- License: MIT (declared in the README and in each skill's front matter; the repository ships no LICENSE file, so the standard MIT text is reproduced below). Copyright (c) Vercel, Inc. (Vercel Labs)
- Skills used: `react-best-practices`, `composition-patterns`, `react-native-skills` (incl. `rules/ui-styling.md`)
- Used in: `references/react-perf.md`, `references/react-native.md`
- Modifications: reduced to a rule index with one-line summaries (full rule files not vendored); React Native styling rules gated by React Native version / New Architecture with legacy fallbacks; "avoid multiple font sizes" softened to "keep the locked type roles".

## 4. Vercel Web Interface Guidelines

- Repository: https://github.com/vercel-labs/web-interface-guidelines
- Commit: `434b7f91364665f2f733b310ec54809bf8f37937` (2026-10-05)
- License: MIT. Copyright (c) 2025 Vercel Labs
- Used in: `references/web-guidelines.md` (rules from `command.md` verbatim), `references/motion.md`, `references/tokens.md`, `references/copy.md`, `[V]` rules in `scripts/lint-slop.mjs`
- Modifications: the "Title Case for headings/buttons" rule removed; README design items condensed into a table; a mode-scope table added; one designer note (`overflow-x: clip` on html/body).

## 5. UI/UX Pro Max

- Repository: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Commit: `d14efff8ed1faa4187f004f79926f428c8074ec7` (2026-10-23), data v2.15.0
- License: MIT. Copyright (c) 2024 Next Level Builder
- Used in: `data/uupm/**`, `scripts/search.mjs`, `references/knowledge.md`, `references/react-native.md` (pro-rules), `references/anti-slop.md` (aesthetic names)
- Modifications: search reimplemented in Node (no Python); "styles" renamed "aesthetics"; results carry `designer_flags` and slop-prone rows sort last; `MASTER.md` / design-system persistence not ported; data never overrides a saved style, locked tokens or the anti-slop gate.
- Google Fonts metadata: `google-fonts.csv` (and its licence index) lists font family names and metadata derived from https://github.com/google/fonts `METADATA.pb`. No font files are redistributed; each family keeps its own licence (mostly SIL Open Font License 1.1, some Apache 2.0 or Ubuntu Font License), and projects that load a font accept that font's licence.

---

## License texts

### Peter Yang (no-ai-slop)

```
MIT License

Copyright (c) 2026 Peter Yang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Hallmark contributors (Hallmark)

```
MIT License

Copyright (c) 2026 Hallmark contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Vercel, Inc. (agent-skills; standard MIT text, repository has no LICENSE file)

```
MIT License

Copyright (c) Vercel, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Vercel Labs (web-interface-guidelines)

```
MIT License

Copyright (c) 2025 Vercel Labs

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Next Level Builder (ui-ux-pro-max-skill)

```
MIT License

Copyright (c) 2024 Next Level Builder

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
