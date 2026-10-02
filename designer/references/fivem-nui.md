# FiveM / RedM NUI

Load **only** when the brief explicitly says FiveM, RedM, NUI, CEF overlay, txAdmin, ox_lib, QBCore, ESX or Qbox. Mode = `game`, platform = `desktop`. No mobile layout, no 390px screenshots unless asked.

## Runtime facts

- NUI is an embedded Chromium (CEF) page drawn **over the game**. `html, body` must be `background: transparent`; only panels have backgrounds.
- Resource layout:

```lua
-- fxmanifest.lua
fx_version 'cerulean'
game 'gta5'            -- 'rdr3' for RedM (+ rdr3_warning)
ui_page 'html/index.html'
files { 'html/index.html', 'html/*.css', 'html/*.js', 'html/fonts/*', 'html/img/*' }
```

- Lua → UI: `SendNUIMessage({ action = 'open', data = … })`; UI listens with `window.addEventListener('message', (e) => { switch (e.data.action) { … } })`.
- UI → Lua: `fetch(\`https://${GetParentResourceName()}/close\`, { method: 'POST', body: JSON.stringify({}) })` with `RegisterNUICallback('close', function(data, cb) … cb('ok') end)`.
- Cursor/focus: `SetNuiFocus(true, true)` when a menu opens, `SetNuiFocus(false, false)` on close. ESC/Backspace close → post the close callback; never leave focus stuck.
- Hidden state = `display: none` (not opacity 0) so CEF does not keep painting it.

## Layout

- Design at 1920×1080, verify at 2560×1440 and 2560×1080 (21:9). Anchor HUD clusters to edges; center menus with `max-width`, not full stretch on ultrawide.
- Scale with `clamp()` / `vh` for type and panel sizes so 1440p and 4K stay legible; keep hit areas ≥ 32px for mouse.
- Respect the native HUD: minimap bottom-left, weapon/ammo top-right, notifications top-left/right depending on the framework. Do not cover the minimap unless the brief says so.
- Readability over gameplay: scrims and text-shadow (see tokens.md).

## Performance (CEF costs FPS)

- Avoid large `backdrop-filter: blur`, full-screen animated gradients, infinite animations, big box-shadows on many elements, video backgrounds.
- No heavy frameworks for a single panel; vanilla JS or a small build. React/Vue/Svelte are fine for complex UIs (build to static files).
- Ship fonts and icons locally in `html/` (listed in `files`); CDNs work but add latency and break offline servers.

## Framework conventions

- ox_lib / QBCore / ESX / Qbox: match the server's existing UI (read its resources: `ox_lib` notify/context/progress, `qb-menu`, `esx_menu_default`) when the brief is `existing`.
- Read item/job/vehicle data from the real `config.lua` / shared items for placeholders, even in `greenfield`.

## QA outside the game

Playwright cannot run the game. Add a dev shim so the page works in a normal browser:

```js
const isBrowser = !window.invokeNative;
if (isBrowser) {
  document.body.style.background = 'url(dev/gameplay.jpg) center/cover'; // dev only, not in files{}
  window.postMessage({ action: 'open', data: MOCK }, '*');
}
const post = (cb, body = {}) => isBrowser ? Promise.resolve({}) : fetch(`https://${GetParentResourceName()}/${cb}`, { method: 'POST', body: JSON.stringify(body) });
```

Screenshot at 1920×1080 over a real gameplay frame (contrast check), then 2560×1080. Never ship the dev background.

## Variant Studio

`--kind page --viewports desktop`. Put a gameplay screenshot behind variants via `_shared.css` (`body { background: url(...) }`) so contrast is judged honestly.
