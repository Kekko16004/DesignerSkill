# Game UI

Only for briefs that explicitly describe a game UI. FiveM/RedM NUI: also read [fivem-nui.md](fivem-nui.md).

## Source loop

0. Library: `styles.mjs lib path "<game>"` — reuse an existing note.
1. Playwright → https://www.gameuidatabase.com — search `[element] [game]` (HUD, Inventory, Shop, Skill Tree, Map, Settings). Skip if `sources.gameUiDatabase` is false.
2. Playwright → https://interfaceingame.com — same query for videos/screenshots. Skip if `sources.interfaceInGame` is false.
3. WebSearch fallback: `"[Game] [HUD|inventory|skill tree] UI"`; ArtStation/UI reels only if `sources.artStation` is true.
4. Screenshot 2–3 screens. Note: corners vs center, vertical stacks, overlay vs full screen, materials.

If GUIDB is slow/blocked: Interface In Game + web images. Never invent.

## What to extract

- **HUD anchors:** HP/resources usually top-left or bottom; minimap top-right; prompts bottom-center. Never everything in one central card.
- **Mobile safe area:** notch, home indicator, thumbs. Primary actions in the lower third.
- **Panels:** nested (frame → inset → slot). One flat div = slop.
- **Radius:** 0 or chamfer. 8/16px Tailwind corners = corporate menu.
- **Contrast:** text over 3D always has a backing.
- **States:** selected, locked, new, equipped, disabled, hover (PC) vs press (touch), gamepad focus.

## Common surfaces

| Surface | Pattern to look up, not invent |
|---|---|
| HUD | Corner clusters, no navbar |
| Inventory | Slot grid + detail pane, weight/rarity |
| Shop | Buy/sell tabs, visible currency, compare |
| Skill tree | Nodes + links, camera pan, locked fog |
| Pause | Full overlay, dense list, button glyphs |
| Dialogue | Lower third, speaker frame, choice list |

## Mobile game

- Touch 44×44px minimum, 48px better
- No hover-only affordances
- Currency + stamina always visible
- Modals: bottom sheet or full screen, not tiny desktop dialogs
- Gacha/shop: price clarity before glow

## Banned in game

Aceternity bento, shadcn Card, Inter, indigo, Lucide sword, emoji, purple glass.

21st: only `search_logo` / SVG. Never `get_component` as an inventory layout.

## Implementation

HTML/CSS with absolute panels or explicit grid. Ornaments as CSS or downloaded SVG, not emoji. Glow only on active/hover via layered `box-shadow` / `drop-shadow`, not `shadow-lg`.

Engine target (Unity): keep the mock translatable — prefer real child elements over `::before/::after` ornaments, flex over complex grid, solid colors or sprite-ready gradients. See [translate.md](translate.md). GameDeveloperSkill calls this skill for its menu/HUD/pause/game-over phases and expects the approved mock + `translate.mjs uitk` output.
