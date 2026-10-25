#!/usr/bin/env node
// Game slots: list the parts of the mock that the game must render (world, character renders, item previews, minimap…),
// check them, and write the manifest the engine side works from (GameDeveloperSkill: references/ui-bridge.md).
//
//   node game-slots.mjs scan <file|dir> [...] [--out ui-slots.json] [--engine unity|unreal|godot|nucleon|fivem] [--json]
//   node game-slots.mjs css        path of assets/game-slot.css (copy it next to the mock)
//
// Exit 1 when a slot is incomplete or the game scene is baked into the UI (a full-screen background image outside a world slot).
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative, resolve, basename, dirname } from 'node:path';
import { SKILL, args } from './lib/game.mjs';

const { pos, o } = args(process.argv.slice(2));
const cmd = pos[0];
if (cmd === 'css') { console.log(join(SKILL, 'assets', 'game-slot.css')); process.exit(0); }
if (cmd !== 'scan' || pos.length < 2) { console.error('usage: game-slots.mjs scan <file|dir> [...] [--out ui-slots.json] [--engine unity|unreal|godot|nucleon|fivem] [--json] | css'); process.exit(1); }

const KINDS = ['world', 'render-texture', '3d-preview', 'minimap', 'live-camera', 'video', 'sprite'];
// how each kind is made in each engine (the engine worker reads this, then replaces the placeholder)
const ENGINE = {
  world: { unity: 'UI Document with a transparent root over the game camera', unreal: 'UMG widget over the viewport, no background brush', godot: 'CanvasLayer over the 3D scene', nucleon: 'RmlUi document over the scene, body transparent', fivem: 'html/body transparent: GTA is behind the NUI' },
  'render-texture': { unity: 'Camera on its own layer → RenderTexture → VisualElement background (or RawImage)', unreal: 'SceneCapture2D → Render Target → material on an Image widget', godot: 'SubViewport + Camera3D → ViewportTexture on a TextureRect', nucleon: 'capture camera to a render target, bound as an RmlUi image', fivem: 'RegisterPedheadshot → https://nui-img/<txd>/<txd> (peds); otherwise a screenshot resource' },
  '3d-preview': { unity: 'preview stage (scene offset, light rig, turntable) → RenderTexture', unreal: 'SceneCapture2D of a preview actor with its own lights', godot: 'SubViewport with its own World3D and turntable', nucleon: 'preview scene rendered to a target', fivem: 'not available: use a 2D image of the item' },
  minimap: { unity: 'top-down orthographic camera → RenderTexture, masked', unreal: 'SceneCapture2D ortho top-down or a painted map texture', godot: 'SubViewport ortho camera', nucleon: 'ortho capture or a baked map', fivem: 'native radar: leave the space free' },
  'live-camera': { unity: 'Camera → RenderTexture with a noise/scanline material', unreal: 'SceneCapture2D + post material', godot: 'SubViewport camera', nucleon: 'capture camera', fivem: 'not available' },
  video: { unity: 'VideoPlayer → RenderTexture', unreal: 'Media Player → Media Texture', godot: 'VideoStreamPlayer', nucleon: 'video texture', fivem: '<video> in the NUI (keep it small, CEF cost)' },
  sprite: { unity: '2D art from the art pipeline (Sprite / Texture2D)', unreal: 'Texture2D from the art pipeline', godot: 'Texture2D', nucleon: 'image asset', fivem: 'image in html/img/' },
};

const files = [];
const collect = (p) => { const st = statSync(p); if (st.isDirectory()) { for (const f of readdirSync(p)) if (!['node_modules', '.git', '.variant-studio', 'translated'].includes(f)) collect(join(p, f)); } else if (/\.(html?|jsx|tsx|vue|svelte)$/i.test(p)) files.push(p); };
for (const p of pos.slice(1)) { if (!existsSync(p)) { console.error(`not found: ${p}`); process.exit(1); } collect(resolve(p)); }

const attr = (tag, name) => { const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag); return m ? (m[1] ?? m[2]) : null; };
const slots = [], problems = [], notes = [];
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const screen = basename(f).replace(/\.[^.]+$/, '') === 'index' ? basename(dirname(f)) : basename(f).replace(/\.[^.]+$/, '');
  const lineOf = (i) => src.slice(0, i).split('\n').length;
  let hasWorld = false;
  for (const m of src.matchAll(/<[a-zA-Z][^>]*\sdata-game-slot\s*=\s*["'][^"']*["'][^>]*>/g)) {
    const t = m[0];
    const s = { id: attr(t, 'data-game-slot'), screen, file: relative(process.cwd(), f).replace(/\\/g, '/'), line: lineOf(m.index), kind: attr(t, 'data-slot-kind'), subject: attr(t, 'data-slot-subject'), size: attr(t, 'data-slot-size'), framing: attr(t, 'data-slot-framing'), source: attr(t, 'data-slot-source'), status: attr(t, 'data-slot-status') || 'placeholder' };
    if (s.kind === 'world') hasWorld = true;
    const where = `${s.file}:${s.line} ${s.id || '(no id)'}`;
    if (!s.id) problems.push(`${where}: data-game-slot needs an id`);
    if (!KINDS.includes(s.kind)) problems.push(`${where}: data-slot-kind must be one of ${KINDS.join(', ')}`);
    if (s.kind !== 'world' && !s.subject) problems.push(`${where}: data-slot-subject missing (what the game renders, framing, light)`);
    if (s.kind !== 'world' && s.kind !== 'minimap' && !/^\d+x\d+$/.test(s.size || '')) problems.push(`${where}: data-slot-size missing or not WxH (pixels at 1080p)`);
    if (['render-texture', '3d-preview'].includes(s.kind) && !s.framing) notes.push(`${where}: no data-slot-framing (bust, full, item, vehicle, group)`);
    if (slots.some((x) => x.id === s.id && x.screen === screen)) problems.push(`${where}: duplicate id on this screen`);
    slots.push(s);
  }
  // the game scene painted into the UI: a full-screen background image outside a world slot
  const css = [...src.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((x) => x[1]).join('\n');
  for (const r of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = r[1].trim(), body = r[2];
    if (/game-slot|preview-scene/.test(sel)) continue;
    const bgImg = /background(-image)?\s*:[^;]*url\(/i.test(body);
    const full = /^(html|body|:root|main|#app|\.app|\.screen|\.bg|\.background|\.scene|\.stage)\b/i.test(sel) || (/position\s*:\s*(fixed|absolute)/.test(body) && /inset\s*:\s*0|width\s*:\s*100v?w?%?/.test(body));
    if (bgImg && full) problems.push(`${relative(process.cwd(), f)}: "${sel}" paints a scene image behind the UI: that is the game, make it <div class="game-slot" data-game-slot="world" data-slot-kind="world">`);
  }
  if (!hasWorld && slots.some((x) => x.screen === screen)) notes.push(`${screen}: no world slot (fine for a full-screen menu that has no game behind it)`);
}

const engine = o.engine && Object.values(ENGINE)[0][o.engine] ? o.engine : null;
const manifest = { version: 1, generated: new Date().toISOString(), engine, slots: slots.map((s) => ({ ...s, how: engine ? ENGINE[s.kind]?.[engine] : ENGINE[s.kind] })) };
if (o.out) writeFileSync(o.out, JSON.stringify(manifest, null, 2) + '\n');
if (o.json) console.log(JSON.stringify({ ...manifest, problems, notes }, null, 2));
else {
  console.log(`game slots: ${slots.length} in ${files.length} files${o.out ? ` → ${o.out}` : ''}`);
  for (const s of slots) console.log(`  ${s.screen.padEnd(14)} ${String(s.id).padEnd(22)} ${String(s.kind).padEnd(15)} ${s.size || ''}  ${s.subject || ''}`);
  for (const p of problems) console.log(`  x ${p}`);
  for (const n of notes) console.log(`  - ${n}`);
}
process.exit(problems.length ? 1 : 0);
