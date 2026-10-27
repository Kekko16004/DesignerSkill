# Game UI

Only for briefs that explicitly describe a game UI. FiveM/RedM NUI: also read [fivem-nui.md](fivem-nui.md).

The goal is a UI that belongs to **this** game and genre, with the density, materials and craft of the titles players compare it with. The usual failure is not ugliness but blandness: a centered rounded card with a sans-serif list. The pipeline below exists to prevent that.

## 1. Genre profile

```
node "<SKILL>/scripts/game-refs.mjs" match "<brief>"        rank the 23 genre profiles (Italian briefs work)
node "<SKILL>/scripts/game-refs.mjs" genres                 list them
```

Profiles live in `data/game-ui/genres.json`. Each one lists:
- the screens the genre needs and its HUD anatomy;
- layout rules, the materials the genre uses, type direction and motion timing;
- **signature moves**, what top titles do beyond the basics;
- clichés to avoid;
- the **game slots** the genre usually needs.

The genre ids match the 21 playbooks of game-launch-strategist. Two genres can be blended (`--genre survival,horror`).

## 2. Real references (mandatory before tokens)

```
node "<SKILL>/scripts/game-refs.mjs" refs "<brief>" [--genre id] [--titles "A, B"] [--project <PROJECT>] [-n 8] [--shots 4]
```

It collects comparable games in this order:
1. Titles named in the brief.
2. `launch/comps.csv`, when game-launch-strategist has run in this project. These are the direct competitors, measured on real data.
3. The profile's reference titles: the best UIs of the genre.
4. Recent releases of the genre with a good quality score, from **GamesTracker**, when its database is on this machine. Set `GAMESTRACKER_DB` or `config.json` → `gameData.gamesTracker`.

It downloads Steam screenshots to `<PROJECT>/design/refs/<genre>/` and writes `refs.md` next to them. **Look at every image** with the image viewer and fill the notes table in `refs.md`:
- anchors, panels and materials, type, density;
- which signature moves to steal.

Images without UI are discarded.

Then the classic loop for the screens Steam does not show:
0. Library: `styles.mjs lib path "<game>"`. Reuse an existing note.
1. Playwright → https://www.gameuidatabase.com: search `[element] [game]` (HUD, Inventory, Shop, Skill Tree, Map, Settings). Skip it if `sources.gameUiDatabase` is false.
2. Playwright → https://interfaceingame.com: the same query. Skip it if `sources.interfaceInGame` is false.
3. WebSearch fallback: `"[Game] [HUD|inventory|skill tree] UI"`. ArtStation and UI reels only if `sources.artStation` is true.

Never invent a layout that no reference supports. If GUIDB is slow or blocked, use Interface In Game and web images.

## 3. Prompts specific to the game

```
node "<SKILL>/scripts/game-prompt.mjs" "<brief>" [--genre id] [--screens main_menu,hud,inventory] [--title "DayM"]
     [--setting "…"] [--refs "A, B"] [--palette "…"] [--accent "…"] [--material "…"] [--items "CONTINUA, NUOVA PARTITA, …"]
     [--text-lang it] [--tokens <tokens.css>] [--target image|build|both] [--directions 4] [--out design/prompts.md]
```

For each screen it writes:
- **image**: a long prompt for an image model, written as an in-game screenshot. It covers zones with anchors, logo and menu items, materials, type, signature moves, palette, the accent used only for the selected state, resolution, the on-screen language, and a negative list. Never used for FiveM.
- **build**: the brief for HTML variants. It covers zones, real content, every state (selected, focused for gamepad, hover, locked, new, disabled), the genre's layout rules, materials, type, motion, signature moves, game slots and bans.

It also writes 2–6 **directions** that differ in kind, so the variants are not one idea in four colors:
- diegetic object;
- side rail over the scene;
- bold graphic composition;
- thin frames with serials;
- broadcast graphics;
- painted surfaces.

Pass `--tokens` after the token lock, so colors and faces in the prompts are the locked ones. Fill `--setting`, `--items` and `--title` from the GDD or the brief. Generic prompts make generic screens.

## 4. Route: concept images or direct UI (mode `game` only, ask once)

**Find the tool first.** Image generation usually comes from a claude.ai connector, with nothing to install: Canva `generate-image` (`mcp__claude_ai_Canva__generate-image`), or an Adobe Firefly / Express image tool. In Claude Code these tools are often **deferred**: their names appear in the deferred list but they are not loaded. Run ToolSearch (`select:mcp__claude_ai_Canva__generate-image,mcp__claude_ai_Canva__get-generate-image-job`, or the keyword `generate-image`) before deciding that no tool is available. A connector that failed to connect is not available.

When a tool is available, ask the user **once**, with the structured question tool if there is one:

> For the game screens: (a) concept images from prompts first, then replicated in HTML; (b) UI variants built directly from different prompts in Variant Studio (the usual way); (c) both. Image generation may use credits of that service.

- **(a) Concept first.**
  1. One image per direction, from the `image` prompts (same screen, different directions). Write the prompts with `game-prompt.mjs --target image --tokens <tokens.css>`, filled from the GDD/brief (§3). Canva: `generate-image` with `aspectRatio: LANDSCAPE_16_9` (PC/console; `PORTRAIT_9_16` for a phone game) and the prompt verbatim, then `get-generate-image-job` until `SUCCESS` (skip polling when a widget shows the image). Save each image to `<mock dir>/concepts/<screen>-<direction>.png` (download the returned image URL with `curl -L`); keep the "Open generated image" link in DESIGN.md.
  2. Wrap each image in a variant page: a full-bleed `<img>` and the direction name as a caption.
  3. Show them as a Variant Studio round (`--kind page --viewports desktop`) and wait for the pick.
  4. Then replicate the chosen image in HTML (§5) and show 2–3 replicas in a second round (`--parent`): faithful, tighter and bolder interpretations.
  5. **Image first, HTML after — never both at once.** On this route no HTML variant exists before the image pick: the first round is images only. HTML is written only for the chosen image (step 4), and only if the brief asks for HTML / an engine translation.
  6. **One round per screen, and per role.** A screen that differs by role (a HUD for Runner, Cameraman, Control room; one per class or vehicle) is **one separate round per role**, each with its own 3–4 directions: "HUD Runner" (4 images), "HUD Cameraman" (4 images), "HUD Control room" (4 images). Never one image that shows every role together, and never one round that mixes roles. The user may mix directions across roles; keep the shared tokens so any mix stays one family.
  7. **If the user says to use the image tool** ("usa Canva", "use Firefly"), the route is `concept` for **every** screen, not only the key one. If the user asks for HTML only, the route is (b) direct: no images.
  8. **Scope: mode `game` only.** Websites, apps, dashboards and FiveM never use this image-first loop; they keep their own flow (step 6 of SKILL.md).
- **(b) Direct.** The usual step 6: 3–8 HTML variants, one per direction, from the `build` briefs.
- **(c) Both.** Images for the key screen (usually the main menu or the HUD), direct variants for the rest, in the same visual language. The key screens follow every rule of (a): images first, one round per role.
- **No tool available** → (b) without asking.
- **Called as a worker by another skill** (game-developer, game-launch-strategist, any subagent): never ask. The parent asked the user at its lock and passes `UI_ROUTE=concept|direct|both` in the brief (or `ui_route` in `DECISIONI.md` / the GDD). With no route given, use (b). If the route is `concept` or `both` and no tool is reachable from the worker, build (b) and write `concept route skipped: no image tool in worker` in the gate file, so the parent can generate the images itself and send them back.
- **FiveM** → always (b), and simple: a per-screen mix of game and web simplicity (HUD ~85/15 game, bank ~30/70 web), judged on what is asked. No genre art direction, no slots, no image generation ([fivem-nui.md](fivem-nui.md)).

Variant Studio stays mandatory on every route. An image is a reference and a pick; it is never the deliverable.

## 5. From concept image to HTML

Replicate the **UI**, not the picture:

1. **Remove the game.** The scene behind the UI is what the engine renders. Drop it, and mark the area with a world slot (§6). In the mock it is a quiet graded field. `html.preview-scene` with `--slot-preview: url(concept.png)` shows the concept behind it only for comparison.
2. **Find what the game must render.** Character renders, squad on stage, item inspection, vehicle in the garage, portraits, minimap, camera feeds. Each one is a **game slot** with a proper placeholder, never a cropped piece of the concept image and never a stock photo.
3. **Rebuild every UI element as real markup on the locked tokens**: frames, insets, slots, type, icons (real SVG sources only), states. Text is real text, not part of an image.
4. **Keep what made the concept good**: anchors, proportions, density, material layers, ornament. Measure them on the image: column widths, margins, type sizes at 1080p.
5. **Add what an image cannot show**: focus and selected states, hover, locked and disabled, long and short content, the input glyphs.

## 6. Game slots

A game slot is a part of the screen the game renders. Markup contract, with styles in `assets/game-slot.css`; copy that file next to the mock:

```html
<div class="game-slot" data-game-slot="world" data-slot-kind="world" data-slot-subject="foggy street at dusk"><span class="game-slot__tag">world · rendered by the game</span></div>
<div class="game-slot" data-game-slot="squad" data-slot-kind="render-texture" data-slot-framing="group"
     data-slot-subject="the 3 survivors of the last save, full body, campfire light" data-slot-size="420x520"><span class="game-slot__tag">squad · render</span></div>
```

- Kinds:
  - `world`: the scene behind the UI;
  - `render-texture`: characters, portraits, paper doll;
  - `3d-preview`: item or vehicle on a turntable;
  - `minimap`;
  - `live-camera`;
  - `video`;
  - `sprite`: 2D art from the art pipeline.
- Framing: `bust`, `full`, `item`, `vehicle` or `group`. Each one draws a neutral silhouette, the registration corners and a tag.
- `data-slot-subject` says what to render, the framing and the light.
- `data-slot-size` is the size in pixels at 1080p. The engine uses it for the render target.
- Slots are real elements: they keep their place in the layout and translate to the engine (§9).
- Write the manifest the engine side works from:

  ```
  node "<SKILL>/scripts/game-slots.mjs" scan <mock dir> --out <PROJECT>/design/ui-slots.json [--engine unity|unreal|godot|nucleon|fivem]
  ```

  Exit 1 means a slot is incomplete, or a scene image is painted into the UI. Fix it before QA.

GameDeveloperSkill reads `ui-slots.json` and builds each slot in the engine (render texture, capture camera, preview stage, minimap camera). It then replaces the placeholder and re-shoots the screen ([ui-bridge.md](https://github.com/Kekko16004/GameDeveloperSkill/blob/main/game-developer/references/ui-bridge.md)). Outside GameDeveloperSkill, list the slots and their `how` in DESIGN.md.

## 7. What to extract and hold

- **HUD anchors:**
  - HP and resources usually top-left or bottom;
  - minimap top-right (or wherever the genre puts it);
  - prompts bottom-center.

  Never put everything in one central card.
- **Panels are layered.** Frame → inset → slot, with at least one of these: inset shadow, double frame, gradient, texture, border image. One flat div is slop [G1].
- **Faces:** at least a display face for titles and numbers, plus a body face [G2].
- **Menus are anchored** to a side or a corner over the scene, not floated as a centered rounded card [G3].
- **States:** selected, focused, locked, new, equipped, disabled, hover (PC) vs press (touch). Gamepad focus is always visible [G4].
- **Ornament** from the world: corners, chamfers, frame lines, serials, stamps, dividers, real icons [G5].
- **The game is not painted into the UI** [G6].
- **Radius** is 0 or a chamfer. 8–16 px Tailwind corners read as a corporate menu.
- **Contrast:** text over 3D always has a backing (scrim, panel, text shadow).
- **Mobile safe area:** notch, home indicator, thumbs. Primary actions go in the lower third.

## Common surfaces

| Surface | Pattern to look up, not invent |
|---|---|
| HUD | Corner clusters, no navbar |
| Inventory | Slot grid + detail pane, weight/rarity, character or container slot |
| Shop | Buy/sell tabs, visible currency, compare |
| Skill tree | Nodes + links, camera pan, locked fog |
| Pause | Full overlay over the frozen game, dense list, button glyphs |
| Dialogue | Lower third, speaker frame, choice list |
| Lobby / select | Characters on stage (game slots), roster, play button bottom-right |

## Mobile game

- Touch targets 44×44 px minimum, 48 px better
- No hover-only affordances
- Currency and stamina always visible
- Modals: a bottom sheet or full screen, not tiny desktop dialogs
- Gacha / shop: price clarity before glow

## Lint in game mode

`lint-slop.mjs --mode game` (or `--mode fivem`) runs:
- the game rules of before;
- the part of the web gates that also holds in a game, kept in `GAME_MIX`: purple gradients, gradient text, stock Tailwind colors, generic display fonts, placeholder images and names, buzzword and stock-CTA copy;
- `transition-all` and layout animation, counted in FiveM because CEF pays for them;
- the game rules G1–G6 above.

Web-only rules stay out: eyebrows, card-in-card, hero height, reduced motion, image sizes.

## Banned in game

Aceternity bento, shadcn Card, Inter, indigo, Lucide sword, emoji, purple glass, a scene image as the page background.

21st: only `search_logo` and SVG. Never `get_component` as an inventory layout.

## Implementation

HTML/CSS with absolute panels or an explicit grid. Ornaments as CSS or downloaded SVG, not emoji. Glow only on active and hover states, via layered `box-shadow` / `drop-shadow`, not `shadow-lg`.

Engine target (Unity): keep the mock translatable:
- prefer real child elements over `::before/::after` ornaments;
- prefer flex over complex grid;
- use solid colors or sprite-ready gradients.

See [translate.md](translate.md). GameDeveloperSkill calls this skill for its menu, HUD, pause and game-over phases. It expects the approved mock, the `translate.mjs uitk` output and `design/ui-slots.json`.
