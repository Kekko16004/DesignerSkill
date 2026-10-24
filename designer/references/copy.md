# Copy

For any UI or landing copy the designer writes or reviews: heads, ledes, buttons, empty states, errors, tooltips, shop and HUD labels. Every mode. Adapted from no-ai-slop (Peter Yang, MIT) and Hallmark craft § Copy; see [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

Copy-only work (a blog post, an email) is out of scope for the skill; these rules exist so the UI's words are not the slop the visuals avoided.

## Two jobs

**Edit (default).** You write or fix the copy. Make the minimum effective edit with the rules below, then return the copy plus a short **What changed** list.

**Detect.** The user asks to audit, scan or flag copy without rewriting, or the step-8 QA reviews existing copy. Name each pattern below that appears, quote the line, give the fix in a few words. Do not rewrite, score, or guess whether AI wrote it. Named patterns are evidence the user can check. Offer to edit after.

`existing` fidelity: the product's copy is material. Detect, then fix only what the user approves; `text_edits` from Variant Studio are verbatim.

## Before writing

- Know the job: who reads this screen and the one thing they should do after it. Unclear → one question.
- Use the brief's own nouns: the product, the place, the number the user gave, the verb a customer would use.
- Never invent claims, examples, stats, quotes, logos or opinions. A missing fact is a visible slot (`Venue to be announced`), not a made-up value.

## Principles

- **Preserve the owner's voice.** Keep their vocabulary, bluntness, humor. Do not make every line equally tidy.
- **Minimum effective edit.** Fix slop, errors, repetition, unclear lines. Leave strong lines alone.
- **Lead with the point** when the setup adds nothing.
- **Active voice, human or product subjects.** "Install the CLI", not "The CLI will be installed". Inanimate things do not do human verbs.
- **Every line earns its place.** Cut empty qualifiers. Keep "maybe" when it is real uncertainty.
- **Concrete and specific.** "Cut deploy time from 40 minutes to 4" beats "improved efficiency". Names, numbers, dates, mechanisms.
- **Portability test.** If a line could move unchanged to a competitor, another country or another product, it is filler. Cut it or replace it with a fact, mechanism, consequence or judgment only this product has. *Software that works for you* fits anyone; *Invoices that chase themselves* fits one product.
- **Show, don't label.** Cut commentary that calls a point important, surprising or simple. Let the fact carry it.
- **Protect the specific fact.** Never smooth a detail into generic importance.
- **Verbs do the work.** "Made a decision" → "decided". "Has the ability to" → "can".
- **Three tests per line:** can the reader picture it, could it be proven false, could only this business say it.

## Words to cut

Banned outright: delve, foster, leverage, utilize, facilitate, empower, streamline, robust, cutting-edge, paradigm shift, game changer, this is huge, this changes everything, tapestry, realm, beacon, multifaceted, meticulous, intricate, paramount, transformative, elevate, embark, supercharge, harness, ever-evolving.

UI/landing buzzwords (Hallmark H19): seamless, effortless, unlock, unleash, next-generation, world-class, best-in-class, industry-leading, mission-critical, future-proof, reimagine, journey, "Unlock your potential", "quietly trusted by".

Often-empty adverbs (cut unless they carry emphasis, contrast or real rhythm): just, literally, honestly, simply, actually, truly, fundamentally, importantly, crucially, inherently, inevitably.

Often-empty phrases: it's worth noting, it's important to note, at the end of the day, when it comes to, at its core, in today's world, in the age of, in the world of, the reality is, the truth is, in terms of, with regard to, in order to, going forward, let's dive in, "Built for the modern team", "In today's landscape", "Whether you're X or Y", "Say goodbye to", "Click here", "Enter your email below".

Placeholder names and clichés: Jane Doe, John Smith, Acme, Nexus, Lorem ipsum, "Item 1", "Card Title".

## Patterns to cut

| # | Pattern | Example | Fix |
|---|---|---|---|
| 1 | Binary contrast | "Not a tool. A platform." / "It's not just X, it's Y." | State Y directly |
| 2 | Throat-clearing opener | "Here's the thing", "Let me be clear" | Cut, state the point |
| 3 | Faux-insight setup | "What most people get wrong" | Cut the setup, keep the claim |
| 4 | Colon reveal | "The best part: it learns." Also colon titles ("Focus: the app for…") | Plain sentence; colons for lists, labels, quotes |
| 5 | Superficial analysis | "…, highlighting our commitment to" | Say the concrete consequence |
| 6 | Importance puffery | "marks a pivotal moment", "a testament to" | State the fact |
| 7 | Interpretive metadiscourse | "The key point is", "As you can see" | Delete the aside |
| 8 | Weasel attribution | "Experts agree", "studies show" | Name the source or cut; never invent one |
| 9 | Fake-strong verbs | "serves as a centralized hub" | "is", "has", or the real verb |
| 10 | Synonym cycling | agent / assistant / tool for one thing | Repeat the right word |
| 11 | Negative listing | "Not X. Not Y. Z." | Say Z |
| 12 | Dramatic fragmentation | "That's it. That's the whole thing." | Complete sentences |
| 13 | Robotic rhythm | identical sentence shapes, stacked punchy fragments, adjective triads ("fast, simple, powerful") | Vary only where it helps |
| 14 | Rhetorical setup | "What if I told you…", "Plot twist:" | Make the point |
| 15 | Fake-profound kicker | a closing aphorism or mic-drop line | Delete it; end on the clearest concrete line |
| 16 | Summary-recap ending | "Ultimately…", a band that restates the page | End on the last concrete point or action |
| 17 | Formatting slop | emoji in headings, bold mid-sentence, bullets that should be a sentence, headers over two-line sections | Format follows content |
| 18 | Em/en dashes as rhythm | "Fast — really fast" | English copy: none in short UI copy, 1–2 in long prose. **WARN only.** Italian (and other languages) use "–" legitimately: never flag |

`lint-slop.mjs` cites these as `[NAS]`; the machine-checkable ones are words, phrases, dashes and colon reveals. The rest is judged.

## UI copy specifics

| Element | Rule |
|---|---|
| Hero head | 7 words / 50 characters or fewer; says what only this product does |
| Lede / subhead | One sentence, 12 words or fewer: what, for whom, the one difference |
| Section head | What the visitor will see or get ("Three loaves a morning"), never a category label (Features, Our story, Why us); 6 words or fewer |
| Button | The verb of the action ("Book a fitting", "Save API key"). "Continue" only as a flow's second step. Never a stock second action (Learn more, Get started, Book a demo) beside the primary. Game shop: never "Get Started" |
| Error | What happened, why if known, what to do. No "Oops", no exclamation marks |
| Empty state | What is empty, why it matters, one action. Never a bare "No results" |
| Loading | Label ends with `…` ("Saving…"); "Loading…" only past 2 s |
| Follow-up menu item | Ends with `…` ("Rename…") |
| Counts | Numerals ("8 deployments") |
| Person | Second person; avoid "we" in UI controls |
| Space-constrained | `&` over "and" |
| Sample data | `example.com`, values that read as samples, never a figure a visitor could take as a claim |
| Case | Sentence case unless the saved style or STYLE.md decides otherwise |

Punctuation: curly quotes, a true ellipsis `…`, non-breaking space inside unit pairs (`10&nbsp;MB`, `⌘&nbsp;K`), full stop on standalone sentences, none on list items.

Budget (marketing): ~80 words per 900 px screen, ~450 visible words per page; paragraphs two short sentences; lists four items. Read only the heads and the hero: if they tell the story, the rest is the right length.

## Edit workflow

1. Read all the copy on the surface first.
2. Find the core point and the voice traits to keep. Cannot find the point → ask.
3. Detect request → findings list (pattern, quoted line, fix) and stop.
4. Edit → minimum changes, then check:
   - no added claims, stats, quotes; voice still recognisable
   - every generic line passes the portability test
   - banned words, patterns 1–17 gone; dashes per row 18
   - ends on a concrete point or action, not a recap or kicker
5. Any check fails → fix and re-check. Output the copy and **What changed**.
