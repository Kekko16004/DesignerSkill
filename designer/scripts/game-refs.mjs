#!/usr/bin/env node
// Game UI references from real games: genre profile + comparable titles + their Steam screenshots (in-game UI).
//
//   node game-refs.mjs genres                              list the genre profiles
//   node game-refs.mjs match "<brief>"                     rank genres for a brief
//   node game-refs.mjs refs "<brief>" [--genre id] [--titles "A, B"] [--project DIR] [-n 8] [--shots 4] [--no-download] [--json]
//
// Comparables, in this order: --titles, the project's launch/comps.csv (game-launch-strategist), the profile's reference titles,
// then recent well-scored releases of the genre from GamesTracker when its database is on this machine.
// Screenshots go to <project>/design/refs/<genre>/<appid>-<n>.jpg with refs.md next to them. Look at every image:
// keep the ones that show UI, note anchors, materials, type and density (references/game-ui.md). Public Steam endpoints, no key.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { GENRES, SCREENS, genre, matchGenres, gamesTrackerDb, sqlite, projectComps, launchStrategist, args, list } from './lib/game.mjs';

const { pos, o } = args(process.argv.slice(2));
const cmd = pos[0];
const brief = pos.slice(1).join(' ');
const out = (x) => console.log(o.json ? JSON.stringify(x, null, 2) : x);

if (!cmd || cmd === 'help') {
  console.log('usage: game-refs.mjs genres | match "<brief>" | refs "<brief>" [--genre id] [--titles "A, B"] [--project DIR] [-n 8] [--shots 4] [--no-download] [--json]');
  process.exit(cmd ? 0 : 1);
}
if (cmd === 'genres') {
  if (o.json) out(GENRES.map(({ id, label, refs }) => ({ id, label, refs })));
  else for (const g of GENRES) console.log(`${g.id.padEnd(18)} ${g.label}\n${' '.repeat(19)}${g.refs.slice(0, 5).join(', ')}`);
  process.exit(0);
}
if (cmd === 'match') {
  const m = matchGenres(brief, 5);
  if (o.json) out(m);
  else if (!m.length) console.log('no genre matched: pass --genre <id> (game-refs.mjs genres)');
  else for (const x of m) console.log(`${x.id.padEnd(18)} ${String(x.score).padStart(4)}  ${x.why.join(', ')}`);
  process.exit(0);
}
if (cmd !== 'refs') { console.error(`unknown command: ${cmd}`); process.exit(1); }

const g = o.genre ? genre(o.genre) : genre(matchGenres(brief, 1)[0]?.id);
if (!g) { console.error(o.genre ? `unknown genre: ${o.genre} (game-refs.mjs genres)` : 'no genre matched the brief: pass --genre <id>'); process.exit(1); }
const N = Number(o.n) || 8;
const SHOTS = Math.max(0, Number(o.shots ?? 4));
const project = resolve(o.project || process.cwd());
const dir = join(project, 'design', 'refs', g.id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function json(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'designer-skill/1 (game-refs)', 'Accept-Language': 'en' }, signal: AbortSignal.timeout(15000) });
      if (r.status === 429) { await sleep(3000 * (i + 1)); continue; }
      if (!r.ok) return null;
      return await r.json();
    } catch { await sleep(800); }
  }
  return null;
}
const nameKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
async function resolveTitle(title) {
  const r = await json(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&l=english&cc=us`);
  const items = r?.items || [];
  const k = nameKey(title);
  return (items.find((x) => nameKey(x.name) === k) || items.find((x) => nameKey(x.name).startsWith(k) || k.startsWith(nameKey(x.name))) || items[0] || null)?.id ?? null;
}

// ---------------------------------------------------------------- candidates
const cands = [];
const push = (c) => { if (!cands.some((x) => (c.appid && x.appid === c.appid) || (c.title && x.title && nameKey(x.title) === nameKey(c.title)))) cands.push(c); };
for (const t of list(o.titles)) push({ title: t, from: 'brief' });
for (const c of projectComps(project).slice(0, 6)) push({ ...c, from: 'launch/comps.csv' });
const db = gamesTrackerDb();
const curated = g.refs.map((t) => ({ title: t, from: 'genre reference' }));
let trackerPicks = [];
let trackerNote = db ? '' : 'GamesTracker database not found (set GAMESTRACKER_DB or config.json gameData.gamesTracker)';
if (db) {
  const rows = sqlite(db, "select external_id, title, genres, tags, quality_score from games where platform = 'STEAM' and coalesce(discarded, 0) = 0 and quality_score is not null order by quality_score desc limit 400");
  if (!rows) trackerNote = 'GamesTracker found but unreadable (no node:sqlite and no python)';
  else {
    const want = new Set(g.steam.map((s) => s.toLowerCase()));
    const hits = rows.filter((r) => { try { return [...JSON.parse(r.genres || '[]'), ...JSON.parse(r.tags || '[]')].some((x) => want.has(String(x).toLowerCase())); } catch { return false; } });
    trackerPicks = hits.slice(0, 3).map((r) => ({ appid: Number(r.external_id), title: r.title, from: `GamesTracker (quality ${Math.round(r.quality_score)})` }));
    trackerNote = `GamesTracker: ${hits.length} recent releases tagged ${g.steam.slice(0, 3).join('/')}, top ${Math.min(3, hits.length)} added`;
  }
}

// best-in-class references first, then what the genre ships right now (up to 3 slots kept for GamesTracker)
const room = Math.max(0, N - cands.length - trackerPicks.length);
for (const c of curated.slice(0, room)) push(c);
for (const c of trackerPicks) push(c);
for (const c of curated.slice(room)) push(c);

// ---------------------------------------------------------------- resolve + screenshots
const picked = [];
for (const c of cands) {
  if (picked.length >= N) break;
  const appid = c.appid || (await resolveTitle(c.title));
  await sleep(250);
  if (!appid) { picked.push({ ...c, appid: null, error: 'not on Steam (look it up on Game UI Database / Interface In Game)' }); continue; }
  const d = (await json(`https://store.steampowered.com/api/appdetails?appids=${appid}&l=english`))?.[appid]?.data;
  await sleep(300);
  if (!d) { picked.push({ ...c, appid, error: 'store data unavailable' }); continue; }
  const shots = (d.screenshots || []).map((s) => s.path_full).filter(Boolean);
  picked.push({ ...c, appid, title: d.name || c.title, url: `https://store.steampowered.com/app/${appid}/`, genres: (d.genres || []).map((x) => x.description), shots, files: [] });
}

if (!o['no-download'] && SHOTS) {
  mkdirSync(dir, { recursive: true });
  for (const p of picked.filter((x) => x.shots?.length)) {
    // Steam lists key-art-like shots first; spread the picks over the whole set to catch menus and HUD
    const step = Math.max(1, Math.floor(p.shots.length / SHOTS));
    for (let i = 0, k = 0; i < p.shots.length && k < SHOTS; i += step, k++) {
      const f = join(dir, `${p.appid}-${k + 1}.jpg`);
      if (!existsSync(f)) {
        try { const r = await fetch(p.shots[i], { signal: AbortSignal.timeout(20000) }); if (r.ok) writeFileSync(f, Buffer.from(await r.arrayBuffer())); } catch { continue; }
        await sleep(150);
      }
      if (existsSync(f)) p.files.push(f);
    }
  }
}

// ---------------------------------------------------------------- report
const rel = (f) => relative(project, f).replace(/\\/g, '/');
const res = { genre: g.id, label: g.label, project, dir: rel(dir), tracker: trackerNote, launchStrategist: launchStrategist(), comparables: picked.map(({ shots, ...x }) => ({ ...x, files: (x.files || []).map(rel) })) };
const md = [
  `# Game UI references: ${g.label}`,
  '',
  `Brief: ${brief || '—'}`,
  '',
  `Generated by \`game-refs.mjs\`. ${trackerNote}. ${projectComps(project).length ? 'Comparables from launch/comps.csv included.' : 'No launch/comps.csv in this project (game-launch-strategist writes it).'}`,
  '',
  '| Game | Source | Screens |',
  '|---|---|---|',
  ...picked.map((p) => `| ${p.url ? `[${p.title}](${p.url})` : p.title} | ${p.from} | ${p.error ? p.error : (p.files || []).map((f) => `![](${relative(dir, f).replace(/\\/g, '/')})`).join(' ') || `${p.shots?.length || 0} on Steam`} |`),
  '',
  '## Look for',
  '',
  `- Screens of this genre: ${g.screens.map((s) => SCREENS[s]?.label || s).join(', ')}.`,
  ...g.hud.map((h) => `- HUD: ${h}`),
  ...g.layout.map((l) => `- Layout: ${l}`),
  `- Materials seen in the genre: ${g.materials.join('; ')}.`,
  `- Type: ${g.type}.`,
  `- Motion: ${g.motion}.`,
  `- Signature moves to steal (pick 2-3, never all): ${g.signature.join('; ')}.`,
  `- Avoid: ${g.avoid.join('; ')}.`,
  `- Game slots (rendered by the game, not the UI): ${g.slots.map((s) => `${s.kind} — ${s.where}`).join('; ') || 'none'}.`,
  '',
  '## Notes (fill in after looking at every image)',
  '',
  '| Game | Screen | Anchors | Panels / materials | Type | Density | Steal |',
  '|---|---|---|---|---|---|---|',
  '',
].join('\n');
if (!o['no-download']) { mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'refs.md'), md); }
if (o.json) out(res);
else {
  console.log(`${g.id}: ${g.label}`);
  for (const p of picked) console.log(`  ${p.error ? 'x' : '+'} ${String(p.title).padEnd(36)} ${p.appid || '—'}  ${p.from}${p.error ? '  ' + p.error : `  ${(p.files || []).length}/${p.shots?.length || 0} shots`}`);
  console.log(`  ${trackerNote}`);
  if (!o['no-download']) console.log(`  → ${rel(join(dir, 'refs.md'))}`);
}
