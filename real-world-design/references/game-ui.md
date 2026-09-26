# Game UI

## Source loop

1. Playwright → https://www.gameuidatabase.com — cerca `[elemento] [gioco]` (HUD, Inventory, Shop, Skill Tree, Map, Settings). Skip se `sources.gameUiDatabase` è false.
2. Playwright → https://interfaceingame.com — stessa query per video/screenshot. Skip se `sources.interfaceInGame` è false.
3. WebSearch backup: `"[Game] [HUD|inventory|skill tree] UI"` + ArtStation/UI reel solo se `sources.artStation` è true.
4. Screenshot 2–3 schermi. Annota: corners vs center, stack verticale, overlay vs full-screen, materiali.

Se GUIDB è lento/blocked: Interface In Game + immagini dal web. Non inventare.

## Cosa estrarre

- **Anchors HUD:** HP/risorse di solito top-left o bottom; minimap top-right; prompt bottom-center. Non mettere tutto in una card centrale.
- **Safe area mobile:** notch, home indicator, thumbs. Azioni primarie nel terzo inferiore.
- **Pannelli:** nested (frame → inset → slot). Un div piatto = slop.
- **Radius:** 0 o chamfer. Angoli 8/16px da Tailwind = menu aziendale.
- **Contrasto:** misura a occhio sullo screenshot: testo su 3D ha sempre backing.
- **Stati:** selected, locked, new, equipped, disabled, hover (PC) vs press (touch).

## Superfici comuni

| Superficie | Pattern da cercare, non da inventare |
|---|---|
| HUD | Corner clusters, niente navbar |
| Inventario | Grid slot + detail pane, peso/rarity |
| Shop | Buy/sell tabs, valuta visibile, compare |
| Skill tree | Nodi + connessioni, camera pan, locked fog |
| Pause | Full overlay, lista densa, glyphs tasti |
| Dialogue | Lower-third, speaker frame, choice list |

## Mobile game

- Touch 44×44px minimo, 48px meglio
- Niente hover-only
- Currency + stamina sempre visibili
- Modali: sheet dal basso o full-screen, non tiny dialog desktop
- Gacha/shop: chiarezza prezzo prima del glow

## Vietato in game

Aceternity bento, shadcn Card, Inter, indigo, Lucide sword, emoji, glass viola.

21st: solo `search_logo` / SVG. Mai `get_component` come layout di inventario.

## Implementazione

HTML/CSS, pannelli assoluti o grid esplicita. Sprite/ornamenti come CSS o SVG scaricati, non emoji. Glow solo su active/hover tramite `box-shadow` / `drop-shadow` a più strati, non `shadow-lg`.
