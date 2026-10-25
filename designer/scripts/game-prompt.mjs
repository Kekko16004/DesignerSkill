#!/usr/bin/env node
// Game UI prompts, specific to the genre and to each screen, from the genre profile + the brief (+ the locked tokens).
//
//   node game-prompt.mjs "<brief>" [--genre id] [--screens main_menu,hud] [--title "DayM"] [--setting "abandoned Soviet town, late autumn"]
//        [--refs "S.T.A.L.K.E.R. 2, Metro Exodus"] [--palette "desaturated autumn, ochre, moss green"] [--accent "sodium amber"]
//        [--material "anthracite translucent panel, bone-white frame lines"] [--items "CONTINUA, NUOVA PARTITA, CO-OP, OPZIONI, ESCI"]
//        [--text-lang it] [--tokens tokens.css] [--mode game|fivem] [--target image|build|both] [--directions 4] [--res 1920x1080]
//        [--out prompts.md] [--json]
//
// image  = a prompt for an image model (concept of the screen as an in-game screenshot). Never for fivem.
// build  = a build brief for Variant Studio variants made directly in HTML/CSS (zones, states, data, game slots, bans, directions).
// Every image is a reference: it is replicated in HTML without its game scene (references/game-ui.md, From concept image to HTML).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { GENRES, SCREENS, genre, matchGenres, args, list } from './lib/game.mjs';

const { pos, o } = args(process.argv.slice(2));
let brief = pos.join(' ');
if (o.from) { const f = JSON.parse(readFileSync(o.from, 'utf8')); brief = brief || f.brief || ''; for (const [k, v] of Object.entries(f)) if (o[k] === undefined) o[k] = Array.isArray(v) ? v.join(', ') : v; }
if (!brief && !o.genre) { console.error('usage: game-prompt.mjs "<brief>" [--genre id] [--screens a,b] [--title T] [--setting S] [--refs "A, B"] [--items "A, B"] [--mode game|fivem] [--target image|build|both] [--json]'); process.exit(1); }
const fivem = o.mode === 'fivem' || /\b(fivem|redm|nui|qbcore|esx|ox_lib|qbox)\b/i.test(brief);
// one genre, or two blended ("--genre survival,horror", or the two best matches when they are close)
const ranked = matchGenres(brief, 2);
const ids = list(o.genre).length ? list(o.genre) : ranked.length > 1 && ranked[1].score >= ranked[0].score - 1.5 ? ranked.map((x) => x.id) : ranked.slice(0, 1).map((x) => x.id);
const parts = ids.map(genre).filter(Boolean);
if (!parts.length && fivem) parts.push(genre('open_world_action'));
if (!parts.length) { console.error(list(o.genre).length ? `unknown genre: ${o.genre} (node game-refs.mjs genres)` : 'no genre matched: pass --genre <id> (node game-refs.mjs genres)'); process.exit(1); }
const mix = (k) => [...new Set(parts.flatMap((p, i) => (i ? p[k].slice(0, 2) : p[k])))];
const g = { ...parts[0], id: parts.map((p) => p.id).join('+'), label: parts.map((p) => p.label).join(' + '),
  materials: mix('materials'), signature: mix('signature'), avoid: mix('avoid'), slots: parts.flatMap((p) => p.slots), refs: mix('refs'),
  layout: [...new Set(parts.flatMap((p) => p.layout))], hud: parts[0].hud, screens: [...new Set(parts.flatMap((p) => p.screens))] };
const noun = parts.map((p) => p.label.split(/[/(]/)[0].trim().toLowerCase()).join(' ');
const target = fivem ? 'build' : (o.target || 'both');
if (fivem && o.target === 'image') console.error('fivem: image prompts are not used for NUI, writing build briefs only');
// screens named in the brief win over the genre defaults (Italian and FiveM words included)
const SCREEN_WORDS = [
  [/\b(inventory|inventario|zaino|hotbar)\b/i, 'inventory'], [/\bhud\b/i, 'hud'], [/\b(shop|negozio|armeria|market|store)\b/i, 'shop'],
  [/\b(bank|banca|atm|wallet)\b/i, 'finances'], [/\b(phone|telefono|cellulare)\b/i, 'phone'], [/\bgarage\b/i, 'garage'],
  [/\b(mdt|tablet|computer|terminal)\b/i, 'terminal'], [/\b(admin|staff|txadmin)\b/i, 'staff'], [/\b(notif\w*|notify|toast)\b/i, 'event_popup'],
  [/\b(radial|radiale|target|interact\w*)\b/i, 'choice'], [/\b(multichar\w*|character select|selezione personaggio)\b/i, 'character_select'],
  [/\b(crafting|banco da lavoro)\b/i, 'crafting'], [/\b(loading|caricamento)\b/i, 'loading'], [/\b(death|morte|respawn)\b/i, 'death_screen'],
  [/\b(map|mappa)\b/i, 'map'], [/\b(settings|impostazioni)\b/i, 'settings'], [/\b(scoreboard|classifica)\b/i, 'scoreboard'],
  [/\b(dialog\w*|npc)\b/i, 'dialogue'], [/\b(main menu|menu principale)\b/i, 'main_menu'], [/\b(pause|pausa)\b/i, 'pause'],
];
const named = SCREEN_WORDS.filter(([re, s]) => re.test(brief) && SCREENS[s]).map(([, s]) => s);
const screens = (list(o.screens).length ? list(o.screens) : named.length ? [...new Set(named)] : g.screens.slice(0, 4)).filter((s) => SCREENS[s] || console.error(`unknown screen: ${s}`));
const res = o.res || '1920x1080';
const textLang = o['text-lang'] || (/[àèéìòù]|\b(il|lo|della|una|per|gioco)\b/i.test(brief) ? 'it' : 'en');
const refs = list(o.refs).length ? list(o.refs) : g.refs.slice(0, 2);
const nDir = Math.min(6, Math.max(2, Number(o.directions) || 4));

// locked tokens → concrete colors and faces in the prompts
const tok = {};
if (o.tokens && existsSync(o.tokens)) for (const m of readFileSync(o.tokens, 'utf8').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) tok[m[1]] = m[2].trim();
const face = (k) => (tok[k] || '').split(',')[0].replace(/["']/g, '').trim();
const palette = o.palette || [tok['--paper'] && `paper ${tok['--paper']}`, tok['--ink'] && `ink ${tok['--ink']}`, tok['--rule'] && `rules ${tok['--rule']}`].filter(Boolean).join(', ') || null;
const accent = o.accent || tok['--accent'] || null;
const typeLine = face('--font-display') ? `display face ${face('--font-display')}${face('--font-body') ? `, body ${face('--font-body')}` : ''}${face('--font-mono') ? `, numbers ${face('--font-mono')}` : ''}` : g.type;

// where each zone goes on the most common screens (otherwise the references decide)
const ANCHORS = {
  main_menu: ['the game logo top-left', 'a vertical menu column on the left third', 'a context card right under the menu', 'a thin footer strip along the bottom edge'],
  pause: ['the frozen gameplay dimmed behind', 'the menu column on the left', 'the objective or map summary on the right', 'input prompts bottom-right'],
  hud: ['vitals in the bottom-left corner', 'ammo or resources bottom-right', 'the objective top-right', 'compass or minimap top-center or top-left', 'interaction prompt bottom-center', 'notifications stacked on the right edge'],
  inventory: ['the character or container on the left', 'the item grid in the center', 'the item detail panel on the right', 'categories as tabs along the top', 'capacity and input prompts along the bottom'],
  character: ['a full-body character render in the center', 'equipment slots around it', 'stats with comparisons on the right', 'tabs along the top'],
  equipment: ['slot columns on the left', 'the character in the center', 'stat comparison on the right'],
  map: ['the map surface full screen', 'legend and filters on the right edge', 'region info bottom-left', 'input prompts bottom-right'],
  dialogue: ['the speaker portrait bottom-left', 'the name plate above the text box', 'the text box across the lower third', 'choices stacked above the text box on the right'],
  shop: ['the vendor on the left', 'the item list in the center', 'item detail and comparison on the right', 'currency top-right'],
  crafting: ['the recipe list on the left', 'the selected recipe with ingredients in the center', 'the craft button and queue on the right'],
  settings: ['category tabs along the top', 'the options list on the left two thirds', 'the description and preview of the selected option on the right'],
  lobby: ['the squad on stage in the center', 'the play button and mode bottom-right', 'party list on the left', 'currency and profile top-right'],
  skill_tree: ['the tree filling the screen', 'the selected node detail on the right', 'points available top-left'],
  results: ['the outcome big at the top', 'stats in the middle', 'rewards along the bottom'],
  game_over: ['the moment in the center', 'cause and stats under it', 'retry and quit at the bottom'],
  death_screen: ['the moment in the center', 'what happened under it', 'retry at the bottom'],
};
const zonesFor = (s) => ANCHORS[s] || SCREENS[s].zones;
const SLOT_WORDS = { inventory: /inventory|paper doll|item/, character: /character|equipment|paper doll/, equipment: /equipment|character/, lobby: /lobby|squad/, hero_select: /select|hero/, character_select: /select/, versus_screen: /versus/, dialogue: /dialogue|portrait|speaker/, garage: /garage|car|vehicle/, team_select: /select|lineup|headshot/, map: /map|minimap/, hud: /minimap|compass|behind the hud/, loadout: /loadout|weapon/, codex: /codex/, item_description: /item|description/, store: /store|skin/, selection_panel: /selection|portrait/, info_panel: /portrait|info/, files_reader: /item/, phone: /phone|contact/ };
function slotsFor(s) {
  const out = [];
  if (g.slots.some((x) => x.kind === 'world') || s === 'hud') out.push({ id: 'world', kind: 'world', subject: fivem ? 'GTA world (NUI is transparent over the game)' : `the live game scene behind the ${SCREENS[s].label.toLowerCase()}` });
  const re = SLOT_WORDS[s];
  if (re) for (const x of g.slots) if (x.kind !== 'world' && re.test(x.where)) out.push({ id: `${s}-${x.kind}`, kind: x.kind, subject: x.where, optional: Boolean(x.optional) });
  if (fivem && /character|inventory|lobby|phone|dialogue|info_panel|selection_panel/.test(s)) out.push({ id: `${s}-headshot`, kind: 'render-texture', subject: 'player ped headshot (RegisterPedheadshot → https://nui-img/<txd>/<txd>)' });
  return out.filter((x, i) => out.findIndex((y) => y.id === x.id) === i);
}
const pick = (arr, i) => arr[i % arr.length];
// lines of the profile that talk about this screen (by its id and label words); fallback: the first n
function about(s, arr, n = 2) {
  const words = [...new Set([...s.split('_'), ...SCREENS[s].label.toLowerCase().split(/[^a-z]+/)])].filter((w) => w.length > 2 && !['screen', 'menu', 'select'].includes(w));
  const hit = arr.filter((x) => words.some((w) => x.toLowerCase().includes(w)));
  return hit.length ? hit : arr.slice(0, n);
}
const MENU_LIKE = new Set(['main_menu', 'pause', 'loading', 'lobby', 'title']);

const DIRS = [
  { id: 'a', name: 'Diegetic', idea: (i) => `the UI is an object of the world (${pick(g.materials, i)}): it has wear, edges and light from the scene` },
  { id: 'b', name: 'Side rail', idea: (i) => `one strong vertical rail anchored to a side over the live scene, ${pick(g.materials, i)}, everything else stays on the scene` },
  { id: 'c', name: 'Graphic', idea: (i) => `a bold graphic composition: big type, angles or a signature shape (${pick(g.signature, i)})` },
  { id: 'd', name: 'Frames', idea: (i) => `thin double frames with corner marks, serials and dividers, information-dense like ${refs[0]}, ${pick(g.materials, i + 1)}` },
  { id: 'e', name: 'Broadcast', idea: () => 'TV-broadcast or device graphics: lower thirds, data plates, tickers' },
  { id: 'f', name: 'Painted', idea: (i) => `illustrated and painted surfaces, ornament from the world's own culture (${pick(g.materials, i + 2)})` },
];

function imagePrompt(s) {
  const sc = SCREENS[s];
  const zones = zonesFor(s).join('; ');
  const items = list(o.items);
  const t = o.title && MENU_LIKE.has(s) ? ` game logo "${o.title}" in the display face;` : '';
  const what = MENU_LIKE.has(s) && items.length ? ` menu items ${items.join(', ')}, the first one selected and highlighted${accent ? ` with the ${accent} accent` : ''};` : '';
  const setting = o.setting ? ` set in ${o.setting}` : '';
  return [
    `In-game screenshot of ${sc.image} of a ${noun} video game${setting} (${refs.join(' / ')} quality, AAA UI). Brief: ${brief || g.label}.`,
    `Background: the game's real-time 3D scene for this moment, softly lit, kept behind the UI.`,
    `Layout: ${zones};${t}${what} realistic content for this game (numbers, names, item names, prompts), no lorem ipsum.`,
    `Style: ${o.material || pick(g.materials, 0)}; ${typeLine}; ${about(s, g.signature).slice(0, 2).join('; ')}.`,
    `${palette ? `Palette: ${palette}. ` : ''}${accent ? `Accent: ${accent}, used only for the selected state. ` : ''}Readable at 1080p, rich detail but a clean hierarchy, ${res.replace('x', '×')}, 16:9, crisp legible text in ${textLang === 'it' ? 'Italian' : 'English'}, gamepad button prompts.`,
    `Negative: ${[...g.avoid, 'rounded SaaS buttons and cards', 'generic sans-serif UI', 'purple or indigo gradient', 'glassmorphism', 'neon glow unless the brief asks', 'garbled or illegible text', 'watermark', 'UI of a different game'].join(', ')}.`,
  ].join('\n');
}

// FiveM NUI: always simple, always a mix of web-app simplicity and game-overlay simplicity.
// The ratio is judged per screen (HUD ≈ 80/20 game, bank ≈ 30/70) and nudged by the brief's own words.
// No game-art layers, no slots, no image generation.
const FIVEM_GAME_PCT = { hud: 85, weapon_wheel: 80, choice: 75, event_popup: 70, death_screen: 70, loading: 65, inventory: 65, objectives: 65,
  equipment_slots: 60, crafting: 55, dialogue: 55, scoreboard: 55, map: 55, character_select: 50, character: 50, garage: 45, phone: 40,
  shop: 40, store: 40, equipment_shop: 40, vehicle_select: 45, settings: 30, finances: 30, terminal: 30, staff: 20, files_reader: 25, journal: 35 };
const fivemNudge = () => (/\b(immersiv\w*|gioco|game-?like|in-?game|diegetic\w*|realistic\w*|realistic[oa])\b/i.test(brief) ? 10 : 0)
  - (/\b(semplic\w*|simple|pulit\w*|clean|sito|website|web|dashboard|minimal\w*)\b/i.test(brief) ? 10 : 0);
const fivemMix = (s) => Math.max(15, Math.min(90, (FIVEM_GAME_PCT[s] ?? 50) + fivemNudge()));
function buildBriefFivem(s) {
  const sc = SCREENS[s];
  const g = fivemMix(s), w = 100 - g;
  const gameSide = 'game-overlay simplicity: glanceable, anchored to an edge, icons + numbers over words, bars and slots over tables, the important number is the biggest thing';
  const webSide = 'web-app simplicity: one panel with title, search or tabs, list, detail, an obvious primary action, clear hierarchy and comfortable spacing';
  const [lead, rest] = g >= w ? [gameSide, webSide] : [webSide, gameSide];
  return [
    `Surface: ${sc.label} · FiveM NUI · desktop 1920×1080 · kind page · html/body transparent, the game is behind`,
    `Zones: ${zonesFor(s).join('; ')}.`,
    `Mix: ${g}% game / ${w}% web. Lead with ${lead}; ${Math.min(g, w) >= 40 ? 'balance it with' : 'borrow a little'} ${rest}. Simple, intuitive and good-looking either way.`,
    'Content: real data from the server (config.lua, shared items, jobs, vehicles, accounts) with real names, prices, weights and amounts; one item selected.',
    `States: hover, focus (keyboard), selected, disabled, empty, loading${g >= 60 ? ', low / critical (color + icon, never color alone), cooldown' : ', confirm on money or destructive actions'}.`,
    g >= 70 ? 'Input: keybinds shown on screen; the overlay never steals focus unless it is an open menu (then ESC closes).' : 'Input: ESC / Backspace closes and gives the focus back to the game; keyboard works without the mouse.',
    'Look: solid panels with a backing for contrast over the game, modest radius, one accent for the primary action and the selection, a readable sans with tabular numbers.',
    'Layout: never covers the minimap (bottom-left), the weapon HUD (top-right) or the crosshair.',
    'Performance: no big backdrop-filter, no infinite animations, hidden = display:none, fonts and icons local, 120-180ms transitions on opacity/transform only.',
    'Avoid: SaaS landing tropes (gradients, glow orbs, emoji icons), tiny text, walls of buttons, heavy decoration.',
  ];
}
const DIRS_FIVEM = [
  { id: 'a', name: 'Panel', idea: () => 'one well-structured panel: title, search or tabs, list, detail, primary action at the bottom' },
  { id: 'b', name: 'Side drawer', idea: () => 'a compact drawer anchored to the right edge: list on top, detail and actions below' },
  { id: 'c', name: 'Two columns', idea: () => 'list on the left, detail on the right, actions under the detail' },
  { id: 'd', name: 'Edge overlay', idea: () => 'a minimal overlay hugging one edge: slots, bars and numbers, details only on focus' },
];

function buildBrief(s) {
  if (fivem) return buildBriefFivem(s);
  const sc = SCREENS[s];
  const slots = slotsFor(s);
  const L = [];
  L.push(`Surface: ${sc.label} · ${fivem ? 'FiveM NUI, desktop 1920×1080, transparent page over the game' : `desktop ${res}`} · kind page`);
  L.push(`Zones: ${zonesFor(s).join('; ')}.`);
  L.push(`Content: real names, numbers and items of this game${MENU_LIKE.has(s) && list(o.items).length ? ` (menu: ${list(o.items).join(', ')})` : ''}${o.title && MENU_LIKE.has(s) ? `, logo "${o.title}"` : ''}; every list long enough to show density; one item selected.`);
  L.push(`States: selected, focused (gamepad + keyboard, always visible), hover (mouse), locked, new, disabled, equipped where it applies; input glyphs next to actions.`);
  if (s === 'hud') L.push(`HUD: ${g.hud.join('; ')}.`);
  const lay = about(s, g.layout, 0);
  if (lay.length) L.push(`Layout rules: ${lay.join('; ')}.`);
  L.push(`Materials: ${o.material || g.materials.slice(0, 2).join(' / ')}. Type: ${typeLine}. Motion: ${g.motion}.`);
  L.push(`Signature (pick 2-3): ${[...new Set([...about(s, g.signature), ...g.signature])].join("; ")}.`);
  L.push(`Game slots: ${slots.length ? slots.map((x) => `\`${x.id}\` ${x.kind} — ${x.subject}${x.optional ? ' (optional)' : ''}`).join('; ') : 'none'}. Mark them with data-game-slot (assets/game-slot.css); never paint the game into the UI.`);
  L.push(`Avoid: ${g.avoid.join('; ')}; lint G1-G6 (flat panels, one face, centered card menu, no focus state, no ornament, baked scene).`);
  if (fivem) L.push('NUI: html/body transparent, panels only; respect the native minimap (bottom-left) and weapon HUD (top-right); hidden = display:none; no big backdrop-filter or infinite animations (CEF cost); fonts and icons local.');
  return L;
}

const out = { genre: g.id, label: g.label, brief, mode: fivem ? 'fivem' : 'game', target, screens: [] };
for (const s of screens) {
  const item = { screen: s, label: SCREENS[s].label, slots: fivem ? [] : slotsFor(s) };
  if (target !== 'build') item.image = imagePrompt(s);
  if (target !== 'image') item.build = buildBrief(s);
  out.screens.push(item);
}
out.directions = (fivem ? DIRS_FIVEM : DIRS).slice(0, nDir).map((d, i) => ({ id: d.id, name: d.name, idea: d.idea(i) }));

if (o.json) { const txt = JSON.stringify(out, null, 2); if (o.out) writeFileSync(o.out, txt); console.log(txt); process.exit(0); }
const md = [
  `# Game UI prompts: ${g.label}`, '',
  `Brief: ${brief || '—'}`, `Mode: ${out.mode} · target: ${target} · references: ${refs.join(', ')}`, '',
  '## Directions (one per Variant Studio variant, or one image per direction)', '',
  ...out.directions.map((d) => `- **${d.id.toUpperCase()} ${d.name}**: ${d.idea}.`), '',
  ...out.screens.flatMap((x) => [
    `## ${x.label} (\`${x.screen}\`)`, '',
    ...(x.image ? ['Image prompt:', '', '```text', x.image, '```', ''] : []),
    ...(x.build ? ['Build brief:', '', ...x.build.map((l) => `- ${l}`), ''] : []),
  ]),
].join('\n');
if (o.out) writeFileSync(o.out, md);
console.log(md);
