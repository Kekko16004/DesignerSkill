# Modes

Pick exactly one mode. Do not mix their visual defaults.

**Default:** a request that does not explicitly describe a game UI is a website (`marketing`) or a phone/product app (`product-app`). Never assume `game`, and never assume FiveM, unless the brief says so.

## product-app

Triggers: phone app, web app screen, dashboard, settings, onboarding, chat, agent UI, list, composer, approval, admin panel.

Sources: 2–3 real comparable apps (iOS/Android/web), then Beautiful UI for agent states, 21st for parts.

SaaS kits = ingredients restyled on the tokens, never the final look.

Output: HTML/CSS mock, then the target stack (React+Tailwind by default, React Native for native apps).

## marketing

Triggers: website, landing, hero, pricing, visual changelog, waitlist, studio/portfolio site.

Direction first (one material, one type pairing, one accent). Then at most one Aceternity block.

Banned: hero + 3 feature cards + purple gradient; default 3×2 bento.

Output: mock, then plain HTML or React+Tailwind.

## game

Triggers (explicit game context only): HUD, inventory, shop, skill tree, pause, load/save, dialogue, quest log, crafting, map, diegetic UI, gacha, battle, title screen, mobile game UI.

Platforms: PC/console overlay, or phone (thumb zone, notch, 44px).

Required sources: Game UI Database, Interface In Game (if enabled). 2–3 titles named in the brief.

Banned as skeleton: shadcn Card, bento, SaaS navbar, Inter, indigo, Lucide-as-weapon, Aceternity shaders.

Output: HTML/CSS mock, then the engine target (Unity UI Toolkit via [translate.md](translate.md)) or FiveM NUI ([fivem-nui.md](fivem-nui.md), only when asked).

## Tie-breakers

| Brief | Mode |
|---|---|
| "login page for my app" | product-app |
| "site for my studio" | marketing |
| "landing for my game" | marketing |
| "gym inventory app" | product-app |
| "Hades-like HUD on phone" | game |
| "mobile gacha shop" | game |
| "in-game settings" | game |
| "launcher app settings" | product-app |
| "FiveM garage UI" | game + fivem-nui.md |

Ask once only when the brief mixes game and website/SaaS with no clear priority.

## Saved style vs mode

A saved style (`/designer <style> …`) carries a `mode` in its `meta.json`. Use it as the default; the brief wins if it clearly names another surface (e.g. a game style used for the game's landing → `marketing` with the style's tokens).
